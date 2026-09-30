import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifyTicket, sessionToken, verifySession} from '../auth.mjs';
const secret='t'.repeat(48), now=Date.now();
const ticket=(p)=>{const b=Buffer.from(JSON.stringify(p)).toString('base64url');return b+'.'+crypto.createHmac('sha256',secret).update(b).digest('base64url')};
test('recusa destino diverso, vencimento e adulteração',()=>{
 const valid={target:'gabinetes',email:'a@x',nonce:'1',role:'ADMIN',iat:now,exp:now+30000};
 assert.equal(verifyTicket(ticket({...valid,target:'cipa'}),secret,now),null);
 assert.equal(verifyTicket(ticket({...valid,exp:now-1}),secret,now),null);
 assert.equal(verifyTicket(ticket(valid)+'x',secret,now),null);
 assert.equal(verifyTicket(ticket(valid),secret,now)?.email,'a@x');
});
test('sessão assinada expira e rejeita adulteração',()=>{
 const token=sessionToken({email:'a@x',gabineteId:'g',exp:now+1000},secret);
 assert.equal(verifySession(token,secret,now)?.gabineteId,'g');
 assert.equal(verifySession(token,secret,now+1001),null);
 assert.equal(verifySession(token+'x',secret,now),null);
});