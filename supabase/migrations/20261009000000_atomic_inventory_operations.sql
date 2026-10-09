create or replace function public.save_app_data(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current jsonb;
  v_next jsonb;
begin
  select payload
    into v_current
    from public.app_state
   where id = 'main'
   for update;

  if not found then
    raise exception 'No existe el estado principal de la aplicación.';
  end if;

  v_next := p_payload || jsonb_build_object(
    'sales', coalesce(v_current->'sales', '[]'::jsonb),
    'employeeStocks', coalesce(v_current->'employeeStocks', '[]'::jsonb),
    'employeeStockMovements', coalesce(v_current->'employeeStockMovements', '[]'::jsonb),
    'inventoryMovements', coalesce(v_current->'inventoryMovements', '[]'::jsonb),
    'products',
      coalesce((
        select jsonb_agg(
          case
            when old_product.value is null then new_product.value
            else jsonb_set(
              new_product.value,
              '{stock}',
              coalesce(old_product.value->'stock', new_product.value->'stock', '0'::jsonb),
              true
            )
          end order by new_product.ordinality
        )
        from jsonb_array_elements(coalesce(p_payload->'products', '[]'::jsonb)) with ordinality as new_product(value, ordinality)
        left join lateral (
          select value
            from jsonb_array_elements(coalesce(v_current->'products', '[]'::jsonb))
           where value->>'id' = new_product.value->>'id'
           limit 1
        ) as old_product on true
      ), '[]'::jsonb),
    'employees',
      coalesce((
        select jsonb_agg(
          case
            when old_employee.value is null then new_employee.value
            else jsonb_set(
              new_employee.value,
              '{sales}',
              coalesce(old_employee.value->'sales', new_employee.value->'sales', '0'::jsonb),
              true
            )
          end order by new_employee.ordinality
        )
        from jsonb_array_elements(coalesce(p_payload->'employees', '[]'::jsonb)) with ordinality as new_employee(value, ordinality)
        left join lateral (
          select value
            from jsonb_array_elements(coalesce(v_current->'employees', '[]'::jsonb))
           where value->>'id' = new_employee.value->>'id'
           limit 1
        ) as old_employee on true
      ), '[]'::jsonb)
  );

  update public.app_state
     set payload = v_next
   where id = 'main';

  return v_next;
end;
$$;

create or replace function public.apply_inventory_operation(p_operation text, p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
  v_employee_id text;
  v_product_id text;
  v_quantity integer;
  v_direction text;
  v_notes text;
  v_user text;
  v_employee jsonb;
  v_product jsonb;
  v_variant jsonb;
  v_existing_stock jsonb;
  v_line jsonb;
  v_sale jsonb;
  v_now timestamptz := clock_timestamp();
  v_group_id text := 'sale_group_' || gen_random_uuid()::text;
  v_sales jsonb;
  v_employee_stocks jsonb;
  v_employee_movements jsonb;
  v_inventory_movements jsonb;
  v_products jsonb;
  v_employees jsonb;
  v_sale_total numeric;
  v_unit_price numeric;
  v_unit_cost numeric;
  v_line_quantity integer;
  v_required integer;
  v_available integer;
  v_kind text;
  v_next_stock integer;
  v_status text;
  v_movement_type text;
  v_product_total numeric;
  v_reason text;
begin
  select payload
    into v_payload
    from public.app_state
   where id = 'main'
   for update;

  if not found then
    raise exception 'No existe el estado principal de la aplicación.';
  end if;

  v_sales := coalesce(v_payload->'sales', '[]'::jsonb);
  v_employee_stocks := coalesce(v_payload->'employeeStocks', '[]'::jsonb);
  v_employee_movements := coalesce(v_payload->'employeeStockMovements', '[]'::jsonb);
  v_inventory_movements := coalesce(v_payload->'inventoryMovements', '[]'::jsonb);
  v_products := coalesce(v_payload->'products', '[]'::jsonb);
  v_employees := coalesce(v_payload->'employees', '[]'::jsonb);

  if p_operation = 'add_employee' then
    v_employee := p_input->'employee';
    if coalesce(jsonb_typeof(v_employee), 'null') <> 'object'
       or nullif(btrim(v_employee->>'id'), '') is null
       or nullif(btrim(v_employee->>'name'), '') is null
       or nullif(btrim(v_employee->>'position'), '') is null then
      raise exception 'Completa nombre y puesto válidos para crear el empleado.';
    end if;
    if exists (
      select 1
        from jsonb_array_elements(v_employees)
       where value->>'id' = v_employee->>'id'
    ) then
      raise exception 'El empleado ya existe. Actualiza la lista e intenta nuevamente.';
    end if;

    v_employee := v_employee || jsonb_build_object(
      'sales', 0,
      'debt', 0,
      'savings', 0,
      'payments', 0
    );
    v_employees := jsonb_build_array(v_employee) || v_employees;
    v_employee_id := v_employee->>'id';

    if coalesce(jsonb_typeof(p_input->'initialStock'), 'null') <> 'array' then
      raise exception 'El inventario inicial no tiene un formato válido.';
    end if;

    update public.app_state
       set payload = v_payload || jsonb_build_object('employees', v_employees)
     where id = 'main';

    for v_line in select value from jsonb_array_elements(p_input->'initialStock')
    loop
      v_product_id := v_line->>'productId';
      v_quantity := (v_line->>'quantity')::integer;
      v_notes := nullif(btrim(v_line->>'notes'), '');

      if v_quantity is null or v_quantity < 1 then
        raise exception 'La cantidad inicial debe ser un entero mayor a cero.';
      end if;

      select value into v_product
        from jsonb_array_elements(v_products)
       where value->>'id' = v_product_id
       limit 1;
      if v_product is null then
        raise exception 'Uno de los productos iniciales ya no está disponible.';
      end if;
      if (v_product->>'stock')::integer < v_quantity then
        raise exception 'No hay suficiente stock de % para la asignación inicial.', v_product->>'name';
      end if;

      v_next_stock := (v_product->>'stock')::integer - v_quantity;
      v_status := case when v_next_stock <= (v_product->>'minimumStock')::integer then 'Bajo stock' else 'Activo' end;
      v_products := (
        select coalesce(jsonb_agg(
          case when value->>'id' = v_product_id
            then jsonb_set(jsonb_set(value, '{stock}', to_jsonb(v_next_stock), true), '{status}', to_jsonb(v_status), true)
            else value
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(v_products)
      );

      select value into v_existing_stock
        from jsonb_array_elements(v_employee_stocks)
       where value->>'employeeId' = v_employee_id
         and value->>'productId' = v_product_id
       limit 1;
      if v_existing_stock is null then
        v_employee_stocks := jsonb_build_array(jsonb_build_object(
          'id', 'employee_stock_' || gen_random_uuid()::text,
          'employeeId', v_employee_id,
          'employeeName', v_employee->>'name',
          'productId', v_product_id,
          'productName', v_product->>'name',
          'quantity', v_quantity,
          'totalAssigned', v_quantity,
          'totalSold', 0,
          'updatedAt', v_now
        )) || v_employee_stocks;
      else
        v_employee_stocks := (
          select coalesce(jsonb_agg(
            case when value->>'employeeId' = v_employee_id and value->>'productId' = v_product_id
              then jsonb_set(
                jsonb_set(
                  jsonb_set(value, '{quantity}', to_jsonb(coalesce((value->>'quantity')::integer, 0) + v_quantity), true),
                  '{totalAssigned}', to_jsonb(coalesce((value->>'totalAssigned')::integer, 0) + v_quantity), true
                ),
                '{updatedAt}', to_jsonb(v_now), true
              )
              else value
            end
          ), '[]'::jsonb)
          from jsonb_array_elements(v_employee_stocks)
        );
      end if;

      v_inventory_movements := jsonb_build_array(jsonb_build_object(
        'id', 'movement_' || gen_random_uuid()::text,
        'productId', v_product_id,
        'productName', v_product->>'name',
        'type', 'Salida',
        'quantity', v_quantity,
        'reason', coalesce(v_notes, 'Asignación inicial a ' || (v_employee->>'name')),
        'user', 'Administrador',
        'createdAt', v_now
      )) || v_inventory_movements;
      v_employee_movements := jsonb_build_array(jsonb_build_object(
        'id', 'employee_stock_movement_' || gen_random_uuid()::text,
        'employeeId', v_employee_id,
        'employeeName', v_employee->>'name',
        'productId', v_product_id,
        'productName', v_product->>'name',
        'type', 'Asignación',
        'quantity', v_quantity,
        'notes', coalesce(v_notes, 'Stock inicial asignado al empleado'),
        'createdAt', v_now
      )) || v_employee_movements;
    end loop;
  elsif p_operation = 'record_sale' then
    v_employee_id := p_input->>'employeeId';
    select value into v_employee
      from jsonb_array_elements(v_employees)
     where value->>'id' = v_employee_id
     limit 1;

    if v_employee is null then
      raise exception 'El empleado seleccionado ya no está disponible.';
    end if;

    if coalesce(jsonb_typeof(p_input->'lines'), 'null') <> 'array'
       or coalesce(jsonb_array_length(p_input->'lines'), 0) = 0 then
      raise exception 'Agrega al menos un renglón a la venta.';
    end if;

    v_sale_total := 0;

    for v_line in select value from jsonb_array_elements(p_input->'lines')
    loop
      v_product_id := v_line->>'productId';
      select value into v_product
        from jsonb_array_elements(v_products)
       where value->>'id' = v_product_id
       limit 1;

      if v_product is null then
        raise exception 'Uno de los productos seleccionados ya no está disponible.';
      end if;

      v_line_quantity := (v_line->>'quantity')::integer;
      v_unit_price := (v_line->>'unitPrice')::numeric;

      if v_line_quantity is null or v_line_quantity < 1 or v_unit_price is null or v_unit_price < 0 then
        raise exception 'La cantidad y el precio deben ser válidos.';
      end if;

      v_variant := null;
      if coalesce(jsonb_array_length(v_product->'variants'), 0) > 0 then
        select value into v_variant
          from jsonb_array_elements(v_product->'variants')
         where value->>'id' = v_line->>'variantId'
         limit 1;
        if v_variant is null then
          raise exception 'Selecciona una variedad válida para %.', v_product->>'name';
        end if;
      elsif nullif(v_line->>'variantId', '') is not null then
        raise exception 'La variedad seleccionada ya no está disponible.';
      end if;

      v_unit_cost := coalesce((v_variant->>'cost')::numeric, (v_product->>'cost')::numeric);
      if v_unit_cost is null or v_unit_cost < 0 then
        raise exception 'El producto no tiene un costo válido.';
      end if;

      v_sale := jsonb_build_object(
        'id', 'sale_' || gen_random_uuid()::text,
        'employeeId', v_employee_id,
        'employeeName', v_employee->>'name',
        'productId', v_product_id,
        'productName', v_product->>'name',
        'saleGroupId', v_group_id,
        'quantity', v_line_quantity,
        'unitPrice', v_unit_price,
        'unitCost', v_unit_cost,
        'subtotal', round(v_line_quantity * v_unit_price, 2),
        'total', round(v_line_quantity * v_unit_price, 2),
        'profit', round(v_line_quantity * (v_unit_price - v_unit_cost), 2),
        'paymentMethod', 'Efectivo',
        'createdAt', v_now
      );

      if v_variant is not null then
        v_sale := v_sale || jsonb_build_object(
          'variantId', v_variant->>'id',
          'variantName', v_variant->>'name'
        );
      end if;

      v_sales := jsonb_build_array(v_sale) || v_sales;
      v_sale_total := v_sale_total + (v_sale->>'total')::numeric;
    end loop;

    for v_product_id, v_required, v_product_total in
      select
        value->>'productId',
        sum((value->>'quantity')::integer)::integer,
        sum((value->>'total')::numeric)
      from jsonb_array_elements(v_sales)
      where value->>'saleGroupId' = v_group_id
      group by value->>'productId'
    loop
      select value into v_existing_stock
        from jsonb_array_elements(v_employee_stocks)
       where value->>'employeeId' = v_employee_id
         and value->>'productId' = v_product_id
       limit 1;

      v_available := coalesce((v_existing_stock->>'quantity')::integer, 0);
      if v_existing_stock is null or v_available < v_required then
        select value into v_product
          from jsonb_array_elements(v_products)
         where value->>'id' = v_product_id
         limit 1;
        raise exception 'Stock insuficiente de %; se necesitan % unidades.', v_product->>'name', v_required;
      end if;

      select value into v_product
        from jsonb_array_elements(v_products)
       where value->>'id' = v_product_id
       limit 1;

      v_now := clock_timestamp();
      v_employee_stocks := (
        select coalesce(jsonb_agg(
          case when value->>'employeeId' = v_employee_id and value->>'productId' = v_product_id
            then jsonb_set(
              jsonb_set(
                jsonb_set(value, '{quantity}', to_jsonb(v_available - v_required), true),
                '{totalSold}', to_jsonb(coalesce((value->>'totalSold')::integer, 0) + v_required), true
              ),
              '{updatedAt}', to_jsonb(v_now), true
            ) || jsonb_build_object('employeeName', v_employee->>'name', 'productName', v_product->>'name')
            else value
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(v_employee_stocks)
      );

      v_employee_movements := jsonb_build_array(jsonb_build_object(
        'id', 'employee_stock_movement_' || gen_random_uuid()::text,
        'employeeId', v_employee_id,
        'employeeName', v_employee->>'name',
        'productId', v_product_id,
        'productName', v_product->>'name',
        'type', 'Venta',
        'quantity', v_required,
        'notes', format('Venta registrada por $%s', v_product_total),
        'createdAt', v_now
      )) || v_employee_movements;
    end loop;

    v_employees := (
      select coalesce(jsonb_agg(
        case when value->>'id' = v_employee_id
          then jsonb_set(value, '{sales}', to_jsonb(coalesce((value->>'sales')::numeric, 0) + v_sale_total), true)
          else value
        end
      ), '[]'::jsonb)
      from jsonb_array_elements(v_employees)
    );
  elsif p_operation = 'assign_employee_stock' or p_operation = 'adjust_employee_stock' then
    v_employee_id := p_input->>'employeeId';
    v_product_id := p_input->>'productId';
    v_quantity := (p_input->>'quantity')::integer;
    v_notes := nullif(btrim(p_input->>'notes'), '');
    v_user := coalesce(nullif(p_input->>'user', ''), 'Administrador');
    v_direction := coalesce(p_input->>'direction', 'add');

    if v_quantity is null or v_quantity < 1 then
      raise exception 'La cantidad debe ser un entero mayor a cero.';
    end if;
    if p_operation = 'adjust_employee_stock' and v_direction not in ('add', 'remove') then
      raise exception 'La dirección del ajuste no es válida.';
    end if;

    select value into v_employee
      from jsonb_array_elements(v_employees)
     where value->>'id' = v_employee_id
     limit 1;
    select value into v_product
      from jsonb_array_elements(v_products)
     where value->>'id' = v_product_id
     limit 1;
    select value into v_existing_stock
      from jsonb_array_elements(v_employee_stocks)
     where value->>'employeeId' = v_employee_id
       and value->>'productId' = v_product_id
     limit 1;

    if v_employee is null then
      raise exception 'El empleado seleccionado ya no está disponible.';
    end if;
    if v_product is null then
      raise exception 'El producto seleccionado ya no está disponible.';
    end if;

    if p_operation = 'assign_employee_stock' or v_direction = 'add' then
      if (v_product->>'stock')::integer < v_quantity then
        raise exception 'No hay suficiente stock en bodega para entregar esa cantidad.';
      end if;

      v_next_stock := (v_product->>'stock')::integer - v_quantity;
      v_kind := 'Asignación';
      v_movement_type := 'Salida';
      v_reason := coalesce(v_notes, 'Asignación a ' || (v_employee->>'name'));
      v_employee_stocks := (
        select coalesce(jsonb_agg(
          case when value->>'employeeId' = v_employee_id and value->>'productId' = v_product_id
            then jsonb_set(
              jsonb_set(
                jsonb_set(value, '{quantity}', to_jsonb(coalesce((value->>'quantity')::integer, 0) + v_quantity), true),
                '{totalAssigned}', to_jsonb(coalesce((value->>'totalAssigned')::integer, 0) + v_quantity), true
              ),
              '{updatedAt}', to_jsonb(v_now), true
            ) || jsonb_build_object('employeeName', v_employee->>'name', 'productName', v_product->>'name')
            else value
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(v_employee_stocks)
      );
      if v_existing_stock is null then
        v_employee_stocks := jsonb_build_array(jsonb_build_object(
          'id', 'employee_stock_' || gen_random_uuid()::text,
          'employeeId', v_employee_id,
          'employeeName', v_employee->>'name',
          'productId', v_product_id,
          'productName', v_product->>'name',
          'quantity', v_quantity,
          'totalAssigned', v_quantity,
          'totalSold', 0,
          'updatedAt', v_now
        )) || v_employee_stocks;
      end if;
    else
      v_available := coalesce((v_existing_stock->>'quantity')::integer, 0);
      if v_existing_stock is null or v_available < v_quantity then
        raise exception 'El empleado no tiene suficiente stock para retirar esa cantidad.';
      end if;
      v_next_stock := (v_product->>'stock')::integer + v_quantity;
      v_kind := 'Retiro';
      v_movement_type := 'Entrada';
      v_reason := coalesce(v_notes, 'Retiro a ' || (v_employee->>'name'));
      v_employee_stocks := (
        select coalesce(jsonb_agg(
          case when value->>'employeeId' = v_employee_id and value->>'productId' = v_product_id
            then jsonb_set(
              jsonb_set(
                jsonb_set(value, '{quantity}', to_jsonb(v_available - v_quantity), true),
                '{updatedAt}', to_jsonb(v_now), true
              ) || jsonb_build_object('employeeName', v_employee->>'name', 'productName', v_product->>'name'),
              '{updatedAt}', to_jsonb(v_now), true
            )
            else value
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(v_employee_stocks)
      );
    end if;

    v_status := case when v_next_stock <= (v_product->>'minimumStock')::integer then 'Bajo stock' else 'Activo' end;
    v_products := (
      select coalesce(jsonb_agg(
        case when value->>'id' = v_product_id
          then jsonb_set(jsonb_set(value, '{stock}', to_jsonb(v_next_stock), true), '{status}', to_jsonb(v_status), true)
          else value
        end
      ), '[]'::jsonb)
      from jsonb_array_elements(v_products)
    );
    v_inventory_movements := jsonb_build_array(jsonb_build_object(
      'id', 'movement_' || gen_random_uuid()::text,
      'productId', v_product_id,
      'productName', v_product->>'name',
      'type', v_movement_type,
      'quantity', v_quantity,
      'reason', v_reason,
      'user', v_user,
      'createdAt', v_now
    )) || v_inventory_movements;
    v_employee_movements := jsonb_build_array(jsonb_build_object(
      'id', 'employee_stock_movement_' || gen_random_uuid()::text,
      'employeeId', v_employee_id,
      'employeeName', v_employee->>'name',
      'productId', v_product_id,
      'productName', v_product->>'name',
      'type', v_kind,
      'quantity', v_quantity,
      'notes', coalesce(v_notes, case when v_kind = 'Asignación' then 'Stock asignado al empleado' else 'Stock retirado del empleado' end),
      'createdAt', v_now
    )) || v_employee_movements;
  elsif p_operation = 'add_inventory_movement' then
    v_product_id := p_input->>'productId';
    v_quantity := (p_input->>'quantity')::integer;
    v_movement_type := p_input->>'type';
    v_user := coalesce(nullif(p_input->>'user', ''), 'Administrador');
    v_reason := coalesce(nullif(btrim(p_input->>'reason'), ''), 'Sin motivo indicado');

    select value into v_product
      from jsonb_array_elements(v_products)
     where value->>'id' = v_product_id
     limit 1;
    if v_product is null then
      raise exception 'El producto seleccionado ya no está disponible.';
    end if;
    if v_quantity is null or v_quantity < 1 then
      raise exception 'La cantidad debe ser un entero mayor a cero.';
    end if;
    if v_movement_type not in ('Entrada', 'Salida', 'Ajuste', 'Devolución') then
      raise exception 'El tipo de movimiento no es válido.';
    end if;

    v_next_stock := (v_product->>'stock')::integer;
    if v_movement_type = 'Entrada' then
      v_next_stock := v_next_stock + v_quantity;
    elsif v_movement_type in ('Salida', 'Devolución') then
      if v_next_stock < v_quantity then
        raise exception 'No hay suficiente stock en bodega para registrar la salida.';
      end if;
      v_next_stock := v_next_stock - v_quantity;
    elsif v_movement_type <> 'Ajuste' then
      raise exception 'El tipo de movimiento no es válido.';
    end if;

    v_status := case when v_next_stock <= (v_product->>'minimumStock')::integer then 'Bajo stock' else 'Activo' end;
    v_products := (
      select coalesce(jsonb_agg(
        case when value->>'id' = v_product_id
          then jsonb_set(jsonb_set(value, '{stock}', to_jsonb(v_next_stock), true), '{status}', to_jsonb(v_status), true)
          else value
        end
      ), '[]'::jsonb)
      from jsonb_array_elements(v_products)
    );
    v_inventory_movements := jsonb_build_array(jsonb_build_object(
      'id', 'movement_' || gen_random_uuid()::text,
      'productId', v_product_id,
      'productName', v_product->>'name',
      'type', v_movement_type,
      'quantity', v_quantity,
      'reason', v_reason,
      'user', v_user,
      'createdAt', v_now
    )) || v_inventory_movements;
  elsif p_operation = 'reset_operational_data' then
    v_sales := '[]'::jsonb;
    v_employee_movements := (
      select coalesce(jsonb_agg(value), '[]'::jsonb)
        from jsonb_array_elements(v_employee_movements)
       where value->>'type' <> 'Venta'
    );
    v_employee_stocks := (
      select coalesce(jsonb_agg(
        jsonb_set(
          jsonb_set(
            jsonb_set(value, '{quantity}', coalesce(value->'totalAssigned', '0'::jsonb), true),
            '{totalSold}', '0'::jsonb, true
          ),
          '{updatedAt}', to_jsonb(v_now), true
        )
      ), '[]'::jsonb)
      from jsonb_array_elements(v_employee_stocks)
    );
    v_employees := (
      select coalesce(jsonb_agg(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(value, '{sales}', '0'::jsonb, true),
              '{debt}', '0'::jsonb, true
            ),
            '{savings}', '0'::jsonb, true
          ),
          '{payments}', '0'::jsonb, true
        )
      ), '[]'::jsonb)
        from jsonb_array_elements(v_employees)
    );
    v_payload := v_payload || jsonb_build_object(
      'cuts', '[]'::jsonb,
      'expenses', '[]'::jsonb,
      'payments', '[]'::jsonb,
      'financeMovements', '[]'::jsonb,
      'activity', '[]'::jsonb
    );
  elsif p_operation = 'delete_employee' then
    v_employee_id := p_input->>'employeeId';
    if not exists (
      select 1
        from jsonb_array_elements(v_employees)
       where value->>'id' = v_employee_id
    ) then
      raise exception 'El empleado seleccionado ya no está disponible.';
    end if;
    v_employees := (
      select coalesce(jsonb_agg(value), '[]'::jsonb)
        from jsonb_array_elements(v_employees)
       where value->>'id' <> v_employee_id
    );
    v_employee_stocks := (
      select coalesce(jsonb_agg(value), '[]'::jsonb)
        from jsonb_array_elements(v_employee_stocks)
       where value->>'employeeId' <> v_employee_id
    );
    v_employee_movements := (
      select coalesce(jsonb_agg(value), '[]'::jsonb)
        from jsonb_array_elements(v_employee_movements)
       where value->>'employeeId' <> v_employee_id
    );
  elsif p_operation = 'delete_product' then
    v_product_id := p_input->>'productId';
    select value into v_product
      from jsonb_array_elements(v_products)
     where value->>'id' = v_product_id
     limit 1;
    if v_product is null then
      raise exception 'El producto seleccionado ya no está disponible.';
    end if;
    v_products := (
      select coalesce(jsonb_agg(value), '[]'::jsonb)
        from jsonb_array_elements(v_products)
       where value->>'id' <> v_product_id
    );
    v_employee_stocks := (
      select coalesce(jsonb_agg(value), '[]'::jsonb)
        from jsonb_array_elements(v_employee_stocks)
       where value->>'productId' <> v_product_id
    );
    v_employee_movements := (
      select coalesce(jsonb_agg(value), '[]'::jsonb)
        from jsonb_array_elements(v_employee_movements)
       where value->>'productId' <> v_product_id
    );
  else
    raise exception 'La operación de inventario no está soportada.';
  end if;

  v_payload := v_payload || jsonb_build_object(
    'sales', v_sales,
    'employeeStocks', v_employee_stocks,
    'employeeStockMovements', v_employee_movements,
    'inventoryMovements', v_inventory_movements,
    'products', v_products,
    'employees', v_employees
  );

  update public.app_state
     set payload = v_payload
   where id = 'main';

  return v_payload;
end;
$$;

revoke all on function public.save_app_data(jsonb) from public;
revoke all on function public.apply_inventory_operation(text, jsonb) from public;
grant execute on function public.save_app_data(jsonb) to anon, authenticated;
grant execute on function public.apply_inventory_operation(text, jsonb) to anon, authenticated;
