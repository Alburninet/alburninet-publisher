import { NextRequest, NextResponse } from "next/server";
import { wpFetch } from "@/lib/wp";
export async function POST(req: NextRequest){try{const formData=await req.formData();const file=formData.get("file");if(!(file instanceof File)){return NextResponse.json({error:"File mancante"},{status:400});}const wpRes=await wpFetch("/wp-json/wp/v2/media",{method:"POST",body:(()=>{const fd=new FormData();fd.append("file",file);return fd;})(),});const json=await wpRes.json();return NextResponse.json(json);}catch(e:any){return NextResponse.json({error:e.message},{status:500});}}
