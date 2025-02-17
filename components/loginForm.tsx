import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../contexts/appContext';
import FormTemplate from './formTemplate';

export default function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();
  const { setShouldAttemptAuth } = useContext(AppContext);

  function onSubmit(event: React.FormEvent) {
    toast.dismiss();
    toast.loading('Logging in');
    event.preventDefault();
    fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        password: password,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Logged in');
        setShouldAttemptAuth(true);
        router.push('/');
      } else {
        throw res.text();
      }
    }).catch(async err => {
      try {
        setErrorMessage(JSON.parse(await err)?.error);
      } catch {
        console.error(err);
      } finally {
        toast.dismiss();
        toast.error('Could not log in. Please try again');
      }
    });
  }

  return (
    <FormTemplate>
      <form onSubmit={onSubmit}>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2 ' htmlFor='username'>
            Username
          </label>
          <input onChange={e => setName(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline' id='username' type='text' placeholder='Username' />
        </div>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setPassword(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline' id='password' type='password' placeholder='******************' />
        </div>
        <div className='text-red-500 text-xs italic mb-6'>
          {errorMessage}
        </div>
        <div className='flex flex-wrap gap-y-4 items-center justify-between'>
          <input className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' type='submit' value='Sign In' />
          <Link href='/forgot-password'>
            <a className='inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800'>
              Forgot Password?
            </a>
          </Link>
        </div>
      </form>
    </FormTemplate>
  );
}
