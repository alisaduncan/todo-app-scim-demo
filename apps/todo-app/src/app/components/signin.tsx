import { useState } from 'react';
import { useAuthState } from './authState';

export const Signin = () => {
  const [username, setUsername] = useState<string>('');

  const { onUsernameEnteredFn } = useAuthState();

  const onAuthenticate = async () => {
    const signIn = async () => {

      const org_id = await onUsernameEnteredFn(username);
      if(!org_id) {
        document.getElementById('auth-error')?.classList.replace("invisible", "visible");
        document.getElementById('auth-error')?.classList.remove("hidden");
        return;
      }
      
      window.location.assign(`http://localhost:3333/openid/start/${org_id}`)
    };
    signIn();
  };

    return (
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full text-slate-900 placeholder-slate-400 rounded-md py-2 pl-2 ring-1 ring-slate-200"
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
          />
        </div>

        <button
            className="w-full py-2 px-3 bg-slate-300 rounded-md"
            onClick={onAuthenticate}
            disabled = {!username}
          >
            Sign in
          </button>
          <div id="auth-error" className="hidden invisible" >
            <p className="py-2 text-xl flex justify-center items-center"><span className="text-3xl mr-2">😰</span> Authentication failed</p>
          </div>
      </div>
    );
  }

  export default Signin;
