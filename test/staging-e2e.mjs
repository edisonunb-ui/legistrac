import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const instance=JSON.parse(execFileSync('sudo',['-n','docker','inspect','legistrac-v2-staging'],{encoding:'utf8'}))[0];
const env=Object.fromEntries(instance.Config.Env.map(x=>x.split(/=(.*)/s).slice(0,2)));
const secret=env.PORTAL_SSO_SECRET;
const url='http://127.0.0.1:3040';
function ticket(email,role='ADMIN'){
  const now=Date.now();const p={sub:email,email,role,target:'gabinetes',nonce:crypto.randomUUID(),iat:now,exp:now+60000};
  const body=Buffer.from(JSON.stringify(p)).toString('base64url');
  return body+'.'+crypto.createHmac('sha256',secret).update(body).digest('base64url');
}
async function request(path,{method='GET',cookie='',body}={}){
  const r=await fetch(url+path,{method,headers:{origin:'http://localhost:3040',cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json().catch(()=>null),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
async function login(email,role){const token=ticket(email,role);const r=await request('/api/auth/portal-exchange',{method:'POST',body:{token}});assert.equal(r.status,200);assert.equal((await request('/api/auth/portal-exchange',{method:'POST',body:{token}})).status,401);return r.cookie}
assert.equal((await request('/api/atendimentos')).status,401);
const a=await login('a@test.invalid'),b=await login('b@test.invalid');
const nonce=crypto.randomUUID();
const created=await request('/api/atendimentos',{method:'POST',cookie:a,body:{nome:'Pessoa QA '+nonce,descricao:'Pedido isolado '+nonce,gerarDemanda:true,titulo:'Demanda QA',responsavelEmail:'a@test.invalid'}});
assert.equal(created.status,201);
const demandId=created.data.demanda.id,attendanceId=created.data.atendimento.id;
assert.ok(created.data.atendimento.protocolo.startsWith('GAB-'));
assert.ok((await request('/api/atendimentos',{cookie:a})).data.some(x=>x.id===attendanceId));
assert.ok(!(await request('/api/atendimentos',{cookie:b})).data.some(x=>x.id===attendanceId));
assert.equal((await request('/api/demandas/'+demandId,{method:'PATCH',cookie:b,body:{acao:'ATRIBUIR',responsavelEmail:'b@test.invalid',observacao:'Tentativa'}})).status,404);
assert.equal((await request('/api/demandas/'+demandId+'/historico',{cookie:b})).data.length,0);
for(const action of ['ATRIBUIR','ENVIAR_REVISAO','CONCLUIR','REABRIR']){
  const result=await request('/api/demandas/'+demandId,{method:'PATCH',cookie:a,body:{acao:action,responsavelEmail:'a@test.invalid',observacao:'Justificativa de QA'}});
  assert.equal(result.status,200,action);
}
const admin=await login('edisonunb@gmail.com','SUPERADMIN');
assert.equal((await request('/api/admin/membros',{cookie:admin})).status,200);
assert.equal((await request('/api/admin/membros',{cookie:a})).status,403);
assert.equal((await request('/api/atendimentos',{cookie:admin})).status,403);
console.log('SSO de uso único, protocolo, RLS entre dois gabinetes, revisão e Superadmin: PASS');