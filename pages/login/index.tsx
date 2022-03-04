import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Page from '../../components/Common/Page';

export default function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'login', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        password: password,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.status === 200) {
        router.push('/');
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error logging in please try again');
    });
  }

  return (
    <Page needsAuth={false} title={'Log In'}>
      <>
        <form onSubmit={onSubmit}>
          <div>
            <input
              type='email'
              name='email'
              placeholder='Enter email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{color: 'rgb(0, 0, 0)'}}
              required
            />
          </div>
          <div>
            <input
              type='password'
              name='password'
              placeholder='Enter password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{color: 'rgb(0, 0, 0)'}}
              required
            />
          </div>
          <button type='submit'>LOG IN</button>
        </form>
        <div><Link href='/signup'>SIGN UP</Link></div>
      </>
    </Page>
  );
}