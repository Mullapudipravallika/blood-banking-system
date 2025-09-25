import React, {useState,useEffect} from 'react';

export default function InventoryView({api}){
  const [items,setItems]=useState([]);
  useEffect(()=>{ fetchInventory(); },[]);
  async function fetchInventory(){
    const res = await fetch(api + '/api/inventory');
    const data = await res.json();
    setItems(data);
  }
  return (
    <div>
      <h2>Inventory</h2>
      <table border="1" cellPadding="6">
        <thead><tr><th>Blood Type</th><th>Units</th></tr></thead>
        <tbody>
          {items.map(it=>(
            <tr key={it.blood_type}><td>{it.blood_type}</td><td>{it.units}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
