'use client';
import { logoutAndRedirect } from "@/lib/auth-client";

export default function SignOutButton(){
    return <button onClick={() => logoutAndRedirect('/')}>
        Sign Out
    </button>
}
