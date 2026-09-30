import express from 'express';
import helmet from 'helmet';
import crypto from 'node:crypto';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyTicket, verifySession, sessionToken } from './auth.mjs';

const required = ['PORTAL_SSO_SECRET','DATABASE_URL','DATABASE_AUTH_URL'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} não configurado`);
const secret=process.env.PORTAL_SSO_SECRET;
const superEmail=String(process.env.SUPERADMIN_EMAIL||'edisonunb@gmail.com').toLowerCase();
const authDb=new pg.Pool({connectionString:process.env.DATABASE_AUTH_URL,max:3});
const dataDb=new pg.Pool({connectionString:process.env.DATABASE_URL,max:10});
const app=express();
app.disable('x-powered-by');app.use(helmet());app.use(express.json({limit:'32kb'}));
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)),'public'),{maxAge:'1h'}));
const portalOrigin=process.env.PORTAL_ORIGIN || 'https://portal.nunesinformatica.online';
const permittedOrigins=new Set([portalOrigin,process.env.PUBLIC_ORIGIN].filter(Boolean));
app.use((req,res,next)=>{
  if(req.method!=='GET' && req.method!=='HEAD' && !permittedOrigins.has(req.get('origin'))) return res.sendStatus(403);
  if(req.get('origin')===portalOrigin){res.set('Access-Control-Allow-Origin',portalOrigin);res.set('Access-Control-Allow-Credentials','true');res.set('Vary','Origin')}
  if(req.method==='OPTIONS'){res.set('Access-Control-Allow-Headers','content-type');res.set('Access-Control-Allow-Methods','POST,GET,PATCH,OPTIONS');return res.sendStatus(204)}
  next();
});
const used=new Map();
function consume(nonce,expiry){const now=Date.now();for(const [n,e] of used)if(e<now)used.delete(n);if(used.has(nonce))return false;used.set(nonce,expiry);return true}
async function membership(email){const r=await authDb.query('SELECT gabinete_id, papel FROM membros WHERE email=$1 AND ativo=true',[email.toLowerCase()]);return r.rows[0]||null}
async function withTenant(actor,fn){const client=await dataDb.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('app.gabinete_id',$1,true)",[actor.gabineteId]);const value=await fn(client);await client.query('COMMIT');return value}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
function cookies(req){return Object.fromEntries((req.get('cookie')||'').split(';').map(s=>s.trim().split('=')).filter(x=>x.length===2))}
async function requireAccess(req,res,next){try{
 const s=verifySession(cookies(req).legistrac_session,secret);
 if(!s)return res.status(401).json({error:'Entre pelo Portal CMU.'});
 const current=await membership(s.email);
 if(!current||current.gabinete_id!==s.gabineteId||current.papel!==s.papel)return res.status(403).json({error:'Vínculo de gabinete revogado.'});
 req.actor=s;next();
}catch(e){next(e)}}
function canManage(a){return ['GESTOR','VEREADOR'].includes(a.papel)}
function canWrite(a){return canManage(a)||a.papel==='ASSESSOR'}
function valid(value,max=5000){return typeof value==='string'&&value.trim().length>0&&value.length<=max}
app.get('/api/health',(_req,res)=>res.json({status:'ok',module:'gabinetes'}));
app.post('/api/auth/portal-exchange',async(req,res,next)=>{try{
 const p=verifyTicket(req.body?.token,secret);
 if(!p||!consume(p.nonce,p.exp))return res.status(401).json({error:'Ingresso inválido ou já utilizado.'});
 const m=await membership(p.email);
 const admin=p.email.toLowerCase()===superEmail && p.role==='SUPERADMIN';
 if(!m&&!admin)return res.status(403).json({error:'Usuário sem vínculo ativo com gabinete.'});
 const s={email:p.email.toLowerCase(),gabineteId:m?.gabinete_id||null,papel:m?.papel||null,admin,exp:Date.now()+30*60*1000};
 res.cookie('legistrac_session',sessionToken(s,secret),{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*60*1000});res.json({ok:true});
}catch(e){next(e)}});
async function requireAdmin(req,res,next){const s=verifySession(cookies(req).legistrac_session,secret);if(!s?.admin||s.email!==superEmail)return res.sendStatus(403);req.actor=s;next()}
app.get('/api/admin/gabinetes',requireAdmin,async(req,res,next)=>{try{const r=await authDb.query('SELECT id,nome,ativo FROM gabinetes ORDER BY nome');res.json(r.rows)}catch(e){next(e)}});
app.post('/api/admin/gabinetes',requireAdmin,async(req,res,next)=>{if(!valid(req.body?.nome,160))return res.sendStatus(400);const c=await authDb.connect();try{await c.query('BEGIN');const r=await c.query('INSERT INTO gabinetes(nome) VALUES($1) RETURNING id,nome',[req.body.nome.trim()]);await c.query('INSERT INTO administracao_auditoria(autor,acao,objeto,depois) VALUES($1,$2,$3,$4)',[req.actor.email,'CRIAR_GABINETE',r.rows[0].id,r.rows[0]]);await c.query('COMMIT');res.status(201).json(r.rows[0])}catch(e){await c.query('ROLLBACK');next(e)}finally{c.release()}});
app.get('/api/admin/membros',requireAdmin,async(req,res,next)=>{try{const r=await authDb.query('SELECT email,gabinete_id,papel,ativo FROM membros ORDER BY email');res.json(r.rows)}catch(e){next(e)}});
app.put('/api/admin/membros/:email',requireAdmin,async(req,res,next)=>{
 const email=String(req.params.email||'').toLowerCase(),{gabineteId,papel,ativo=true}=req.body||{};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['GESTOR','VEREADOR','ASSESSOR','CONSULTA'].includes(papel)||typeof gabineteId!=='string'||typeof ativo!=='boolean')return res.sendStatus(400);
 const c=await authDb.connect();try{await c.query('BEGIN');const before=await c.query('SELECT email,gabinete_id,papel,ativo FROM membros WHERE email=$1 FOR UPDATE',[email]);const r=await c.query('INSERT INTO membros(email,gabinete_id,papel,ativo) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET gabinete_id=EXCLUDED.gabinete_id,papel=EXCLUDED.papel,ativo=EXCLUDED.ativo RETURNING email,gabinete_id,papel,ativo',[email,gabineteId,papel,ativo]);await c.query('INSERT INTO administracao_auditoria(autor,acao,objeto,antes,depois) VALUES($1,$2,$3,$4,$5)',[req.actor.email,'ALTERAR_MEMBRO',email,before.rows[0]||null,r.rows[0]]);await c.query('COMMIT');res.json(r.rows[0])}catch(e){await c.query('ROLLBACK');next(e)}finally{c.release()}
});
app.get('/api/me',async(req,res,next)=>{try{const s=verifySession(cookies(req).legistrac_session,secret);if(!s)return res.sendStatus(401);const m=await membership(s.email);if(!m&&!s.admin)return res.sendStatus(403);if(m&&s.gabineteId&&m.gabinete_id!==s.gabineteId)return res.sendStatus(403);res.json({email:s.email,papel:m?.papel||null,admin:s.admin||false})}catch(e){next(e)}});
app.get('/api/atendimentos',requireAccess,async(req,res,next)=>{try{const rows=await withTenant(req.actor,c=>c.query('SELECT id,protocolo,nome,bairro,descricao,criado_em FROM atendimentos ORDER BY criado_em DESC LIMIT 100'));res.json(rows.rows)}catch(e){next(e)}});
app.post('/api/atendimentos',requireAccess,async(req,res,next)=>{try{
 if(!canWrite(req.actor))return res.sendStatus(403);
 const {nome,telefone,bairro,descricao,gerarDemanda=false,titulo,responsavelEmail}=req.body||{};
 if(!valid(nome,200)||!valid(descricao)||telefone?.length>100||bairro?.length>160||gerarDemanda&&!valid(titulo,250))return res.status(400).json({error:'Dados inválidos.'});
 const result=await withTenant(req.actor,async c=>{
  const protocolo=`GAB-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,12).toUpperCase()}`;
  const r=await c.query('INSERT INTO atendimentos(gabinete_id,protocolo,nome,telefone,bairro,descricao,criado_por) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,protocolo',[req.actor.gabineteId,protocolo,nome.trim(),telefone||null,bairro||null,descricao.trim(),req.actor.email]);
  if(!gerarDemanda)return {atendimento:r.rows[0]};
  const dest=responsavelEmail?.toLowerCase()||req.actor.email;
  const d=await c.query('INSERT INTO demandas(gabinete_id,atendimento_id,titulo,descricao,responsavel_email,criada_por) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,status',[req.actor.gabineteId,r.rows[0].id,titulo.trim(),descricao.trim(),dest,req.actor.email]);
  await c.query('INSERT INTO historico(gabinete_id,demanda_id,autor,acao,observacao) VALUES($1,$2,$3,$4,$5)',[req.actor.gabineteId,d.rows[0].id,req.actor.email,'CRIACAO','Demanda registrada a partir do atendimento.']);
  return {atendimento:r.rows[0],demanda:d.rows[0]};
 });res.status(201).json(result);
}catch(e){next(e)}});
app.get('/api/demandas',requireAccess,async(req,res,next)=>{try{const r=await withTenant(req.actor,c=>c.query('SELECT id,atendimento_id,titulo,descricao,status,responsavel_email,criada_em,atualizada_em FROM demandas ORDER BY atualizada_em DESC LIMIT 100'));res.json(r.rows)}catch(e){next(e)}});
app.patch('/api/demandas/:id',requireAccess,async(req,res,next)=>{try{
 if(!canWrite(req.actor))return res.sendStatus(403);
 const {acao,observacao,responsavelEmail}=req.body||{};
 if(!valid(observacao,2000)||!['ATRIBUIR','ENVIAR_REVISAO','CONCLUIR','REABRIR'].includes(acao))return res.status(400).json({error:'Ação e justificativa são obrigatórias.'});
 if(['CONCLUIR','REABRIR'].includes(acao)&&!canManage(req.actor))return res.sendStatus(403);
 const out=await withTenant(req.actor,async c=>{
  const r=await c.query('SELECT id,status,responsavel_email,criada_por FROM demandas WHERE id=$1 FOR UPDATE',[req.params.id]);if(!r.rows[0])return null;
  const current=r.rows[0].status;
  if(acao==='ATRIBUIR'&&!canManage(req.actor)&&r.rows[0].criada_por!==req.actor.email)return {forbidden:true};
  if(acao==='ENVIAR_REVISAO'&&!canManage(req.actor)&&r.rows[0].responsavel_email!==req.actor.email)return {forbidden:true};
  const allowed={ATRIBUIR:['ABERTA','EM_ANDAMENTO','REABERTA'],ENVIAR_REVISAO:['EM_ANDAMENTO','REABERTA','ABERTA'],CONCLUIR:['AGUARDANDO_REVISAO'],REABRIR:['CONCLUIDA']};
  if(!allowed[acao].includes(current))return {error:'Transição de estado inválida.'};
  if(acao==='ATRIBUIR'&&!valid(responsavelEmail,200))return {error:'Responsável obrigatório.'};
  const status={ATRIBUIR:'EM_ANDAMENTO',ENVIAR_REVISAO:'AGUARDANDO_REVISAO',CONCLUIR:'CONCLUIDA',REABRIR:'REABERTA'}[acao];
  const u=await c.query('UPDATE demandas SET status=$1,responsavel_email=CASE WHEN $2 THEN $3 ELSE responsavel_email END,atualizada_em=now() WHERE id=$4 RETURNING id,status,responsavel_email',[status,acao==='ATRIBUIR',responsavelEmail?.toLowerCase()||null,req.params.id]);
  await c.query('INSERT INTO historico(gabinete_id,demanda_id,autor,acao,observacao) VALUES($1,$2,$3,$4,$5)',[req.actor.gabineteId,req.params.id,req.actor.email,acao,observacao.trim()]);return u.rows[0];
 });if(!out)return res.sendStatus(404);if(out.forbidden)return res.sendStatus(403);if(out.error)return res.status(409).json(out);res.json(out);
}catch(e){next(e)}});
app.get('/api/demandas/:id/historico',requireAccess,async(req,res,next)=>{try{const r=await withTenant(req.actor,c=>c.query('SELECT autor,acao,observacao,criado_em FROM historico WHERE demanda_id=$1 ORDER BY criado_em',[req.params.id]));res.json(r.rows)}catch(e){next(e)}});
app.use((err,req,res,next)=>{console.error('Erro Legistrac',err.code||err.name);if(err.code==='23503')return res.status(400).json({error:'Responsável ou registro não pertence ao gabinete.'});res.status(500).json({error:'Falha ao executar operação.'})});
app.listen(Number(process.env.PORT||3040),'0.0.0.0');