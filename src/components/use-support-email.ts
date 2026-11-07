"use client";
import {useEffect,useState} from "react";
export function useSupportEmail(){const [email,setEmail]=useState("concierge@naijaspa.com");useEffect(()=>{const controller=new AbortController();fetch("/api/settings/public",{signal:controller.signal}).then(async r=>{if(r.ok){const j=await r.json();if(j.supportEmail)setEmail(j.supportEmail);}}).catch(()=>{});return()=>controller.abort();},[]);return email;}
