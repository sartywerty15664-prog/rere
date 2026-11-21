import {NextResponse} from 'next/server';
const version='2026-11-21';
export async function POST(request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 let body;try{body=await request.json();}catch{return NextResponse.json({error:'Invalid request'},{status:400});}
 const response=NextResponse.json({ok:true}),options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:31536000};
 if(body.type==='personal-data'&&body.version===version){response.cookies.set('ml_personal_data_consent',version,options);return response;}
 if(body.type==='cookies'&&body.version===version){const value={necessary:true,analytics:body.analytics===true,marketing:body.marketing===true,version,updatedAt:new Date().toISOString()};response.cookies.set('ml_cookie_preferences',encodeURIComponent(JSON.stringify(value)),options);return response;}
 return NextResponse.json({error:'Unsupported consent type or version'},{status:400});
}