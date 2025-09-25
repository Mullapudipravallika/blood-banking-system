import React, {useState} from 'react';
import DonorForm from './components/DonorForm';
import InventoryView from './components/InventoryView';
import RequestForm from './components/RequestForm';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export default function App(){
  const [token,setToken]=useState('');
  return (
    <div style={{padding:20,fontFamily:'Arial, sans-serif'}}>
      <h1>Blood Banking System</h1>
      <p>A blood banking system connects donors with hospitals and blood banks. It manages donor registrations, tracks blood inventory, and facilitates blood requests during emergencies. The platform ensures efficient resource management and timely availability of blood.</p>
      <div style={{display:'flex',gap:20}}>
        <div style={{flex:1}}>
          <h2>Register as Donor</h2>
          <DonorForm api={API} />
          <h2 style={{marginTop:40}}>Request Blood (login required)</h2>
          <RequestForm api={API} token={token} />
        </div>
        <div style={{width:420}}>
          <InventoryView api={API} />
          <div style={{marginTop:20}}>
            <h3>Login (for staff/admin)</h3>
            <Login onToken={setToken} api={API} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Login({onToken, api}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const handle = async (e) => {
    e.preventDefault();
    const res = await fetch(api + '/api/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email,password})
    });
    const data = await res.json();
    if (data.token) onToken(data.token);
    else alert(data.error || 'login failed');
  };
  return (
    <form onSubmit={handle}>
      <input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /><br/>
      <input placeholder='password' type='password' value={password} onChange={e=>setPassword(e.target.value)} /><br/>
      <button>Login</button>
    </form>
  );
}
