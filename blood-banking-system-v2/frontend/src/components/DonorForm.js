import React, {useState} from 'react';

export default function DonorForm({api}){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [phone,setPhone]=useState('');
  const [blood,setBlood]=useState('A+');
  const handle = async (e) => {
    e.preventDefault();
    const res = await fetch(api + '/api/donors', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({name,email,phone,blood_type:blood})
    });
    const data = await res.json();
    if (data.id) {
      alert('Registered: ' + data.name);
      setName('');setEmail('');setPhone('');
    } else {
      alert(data.error || 'error');
    }
  };
  return (
    <form onSubmit={handle}>
      <input placeholder='Name' value={name} onChange={e=>setName(e.target.value)} /><br/>
      <input placeholder='Email' value={email} onChange={e=>setEmail(e.target.value)} /><br/>
      <input placeholder='Phone' value={phone} onChange={e=>setPhone(e.target.value)} /><br/>
      <select value={blood} onChange={e=>setBlood(e.target.value)}>
        <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
      </select><br/>
      <button>Register</button>
    </form>
  );
}
