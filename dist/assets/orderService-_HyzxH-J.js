import{s,f as a,l as p,m as y,n as E,V as g}from"./index-C32sC9cS.js";function I(r,e){const t=g[r]||[];if(!t.includes(e))throw new Error(`Transição inválida: ${r} → ${e}. Permitido: [${t.join(", ")||"nenhum"}]`)}async function h({orderId:r,newStatus:e,actorId:t,actorRole:o,notes:n,extraFields:d={}}){const{data:i,error:f}=await s.from("orders").select("id, status, tracking_token, customer_id").eq("id",r).single();if(f||!i)throw new Error("Pedido não encontrado.");I(i.status,e);const c={status:e,...d};e===a.IN_DELIVERY&&(c.dispatched_at=new Date().toISOString()),e===a.DELIVERED&&(c.delivered_at=new Date().toISOString()),e===a.CONFIRMED&&(c.client_confirmed_at=new Date().toISOString()),e===a.AWAITING_CLIENT&&(c.price_confirmed_at=new Date().toISOString());const{error:l}=await s.from("orders").update(c).eq("id",r);if(l)throw new Error("Erro ao actualizar pedido: "+l.message);if(await s.from("order_status_history").insert({order_id:r,from_status:i.status,to_status:e,changed_by:t||null,notes:n||null}),await p({actorId:t,actorRole:o,action:"ORDER_STATUS_CHANGED",entityType:"order",entityId:r,metadata:{from:i.status,to:e,notes:n}}),[a.AWAITING_CLIENT,a.IN_DELIVERY,a.DELIVERED,a.CANCELLED].includes(e)){const{data:_}=await s.from("orders").select("*, customer:customers(full_name, whatsapp_number)").eq("id",r).single();if(_){const m={[a.IN_DELIVERY]:"order_dispatched",[a.DELIVERED]:"order_delivered",[a.CANCELLED]:"order_cancelled",[a.AWAITING_CLIENT]:"price_confirmation"}[e];if(m){const u=await y(_.tracking_token);await E(m,{order:_,customer:_.customer,trackingUrl:u})}}}return{success:!0,previousStatus:i.status}}async function T({orderId:r,pharmacyId:e,medicationPrice:t,actorId:o,actorRole:n}){const d=await D(r),i=parseFloat(t)+parseFloat(d||0);return h({orderId:r,newStatus:a.AWAITING_CLIENT,actorId:o,actorRole:n,notes:`Farmácia confirmada. Preço: ${t} MZN`,extraFields:{pharmacy_id:e,medication_price:t,total_price:i}})}async function D(r){const{data:e}=await s.from("orders").select("delivery_fee").eq("id",r).single();return(e==null?void 0:e.delivery_fee)||0}async function A({statusFilter:r,search:e,limit:t=50}={}){let o=s.from("orders").select(`
      id, tracking_token, status, medication_name_snapshot,
      delivery_address, delivery_fee, medication_price, total_price,
      payment_method, created_at, updated_at, operator_notes,
      prescription_status,
      customer:customers(id, full_name, whatsapp_number, is_blacklisted),
      zone:delivery_zones(name, delivery_fee)
    `).order("created_at",{ascending:!1}).limit(t);r&&r!=="ALL"&&(o=o.eq("status",r)),e&&(o=o.or(`medication_name_snapshot.ilike.%${e}%`));const{data:n,error:d}=await o;if(d)throw d;return n||[]}async function O(r){const{data:e,error:t}=await s.from("orders").select(`
      *,
      customer:customers(*),
      medication:medications(commercial_name, generic_name, category, requires_prescription),
      zone:delivery_zones(name, delivery_fee),
      pharmacy:pharmacies(name, address, contact_phone),
      motoboy:profiles!orders_assigned_motoboy_id_fkey(full_name, phone),
      operator:profiles!orders_assigned_operator_id_fkey(full_name),
      status_history:order_status_history(
        id, from_status, to_status, notes, created_at,
        changed_by_profile:profiles(full_name)
      )
    `).eq("id",r).single();if(t)throw t;return e}export{O as a,T as c,A as g,h as u};
