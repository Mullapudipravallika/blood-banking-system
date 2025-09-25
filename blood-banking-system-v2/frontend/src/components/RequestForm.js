import React, {useState} from 'react';

export default function RequestForm({api, token}){
  const [name,setName]=useState('');
  const [hospital,setHospital]=useState('');
  const [blood,setBlood]=useState('A+');
  const [units,setUnits]=useState(1);
  const handle = async (e) => {
    e.preventDefault();
    if (!token) { alert('Please login (staff/admin) to submit requests.'); return; }
    const res = await fetch(api + '/api/requests', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({requester_name:name,hospital,blood_type:blood,units: Number(units)})
    });
    const data = await res.json();
    if (data.id) {
      alert('Request submitted. Status: ' + data.status);
    } else {
      alert(data.error || 'error');
    }
  };
  return (
    <form onSubmit={handle}>
      <input placeholder='Your name' value={name} onChange={e=>setName(e.target.value)} /><br/>
      <input placeholder='Hospital' value={hospital} onChange={e=>setHospital(e.target.value)} /><br/>
      <select value={blood} onChange={e=>setBlood(e.target.value)}>
        <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
      </select><br/>
      <input type='number' min='1' value={units} onChange={e=>setUnits(e.target.value)} /><br/>
      <button>Request</button>
    </form>
);
}
