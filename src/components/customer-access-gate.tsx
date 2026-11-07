"use client";
import {useState} from "react";import Link from "next/link";
import {AuthHeading,AuthScreen,authCtaClass} from "./auth-screen";
import {portalNext} from "@/lib/portal-auth";
export function CustomerAccessGate({next,back}:{next:string;back:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function switchAccount(register:boolean){setBusy(true);setError("");try{const r=await fetch("/api/auth/logout",{method:"POST"});if(!r.ok)throw Error();try{sessionStorage.removeItem("naijaspa-pending-booking");}catch{}window.location.replace(register?"/register":`/login?${new URLSearchParams({next:portalNext(next,"customer")})}`);}catch{setError("Could not switch accounts. Please try again.");setBusy(false);}}
 return <AuthScreen><AuthHeading title="Access your customer account" subtitle="You are signed in with a different account type."/><p className="mt-5 text-center text-sm text-ink2">Customer and therapist accounts are separate. Switch to your customer account to book treatments. Your current session stays active until you choose to switch.</p>{error?<p role="alert" className="mt-4 text-red-500">{error}</p>:null}<div className="mt-6 space-y-3"><button disabled={busy} type="button" className={authCtaClass} onClick={()=>void switchAccount(false)}>Log into Customer Account</button><button disabled={busy} type="button" className="min-h-12 w-full rounded-full border border-line" onClick={()=>void switchAccount(true)}>Register as Customer</button><Link className="flex min-h-12 items-center justify-center" href={back}>Cancel</Link></div></AuthScreen>;
}
