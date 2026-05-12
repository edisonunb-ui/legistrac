
import * as admin from "firebase-admin";

/**
 * Inicializa o Firebase Admin SDK usando as credenciais oficiais do projeto "legistrac".
 */
function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  // Chave privada recuperada do histórico de provisionamento estável do projeto legistrac
  const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDZ+SJQtEF4OJzR\njWoPLFeY7CDv4oyHuPjWH8LrEgDNOW0Jmovq6OTKAKGN7xu981byL2Cznzq2xZJ3\nATobS/OpmPXh7n2mxErFgx88T8IZkhUXXoMjrplQzarPbTScozFVRXg/pG1Sba4y\n3yTf4I7XsBT2ENVUsp3ifPXJWr2Uk6rKFdBr7G4gVXz6H4UTmA9HfHhB9zzECK+o\nnNS59CnkEa8VL77j8W7RMEM0XJppTdvaD8Piy31rvrTulxNU7BJPNFsd3llausiR\nh3DD4WKT7XzNgkZF2b4KMaMOcjM1jOUdgg9zzA2BGFcx2OjxL4DMX/PIH8DdWW0i\nqUn/Qm4pAgMBAAECggEABMWBAGyDuuCdYTJz6gdd1weDPJEUY7OzQcex9gCfwx5Q\n0lsfWTn2KSxcnP1pGW5CXtyV5LS1fbMDPuboWVjfKX0jU8nrVvtYyixRwpmZ3YKu\nwsNTQlST/1pzNOV2d3/UiIHz7Qu5x2pGfA9ZsKtrIRJWESFi9B7RWTgETt81Q3Ny\nNve3ew3olUnYYfTzYr+xeN0zltcUHvSP8/to0DdP0N4UoX3ufmA/+EoYL+iRN7iH\n44SwhqHqQ5KMMx5XbNMMU2yd/i6q6R5QUv1E5O+PRiUnbfgkB9ClIhMCvvXYA+nW\nacY1UlJ0kmBs+2DUPrlukYyzejDBcJXonazqpvjL8QKBgQD7KcI6ZGyxxwf6OJ3+\nTp3MzemOr9F7bzjOyrDpzCTol7YbOYEY6ruR70PJtIflfxU42r1O/4xKYeOtFohZ\nyzCVncqqD4SzocoJm/PrMuqAGXaultPTrRfG1cVqBiDd4P/JJeQGljCNO+b562IO\nZz1X0vgsNkoI2k3H7xPc5uGhmQKBgQDeK798pFOGJ+5kWB64DR8oepGmOSQW2C5Q\nV30YkNzVWjSh64IKOfEqyd3vhGFjHSrPYGGu751Y04IpYlJkTS2CGIqP99wj4DPf\nlS14/nhgC0MFa4K05YB2tVhWCOdosK1ClJTlA+xmUHrXbsgc41v97Y7DxlhRAt8t\nRbCf/nIrEQKBgDYOScA5hu9IL95Zux9Vmj7O/np4OrS/PlG7bBIVnsf0hvwbBz7u\nnkoNXeCWmzz4ef/PjDjpZS9JHDBPji8NPTqmSE0Lo/rpUkt5Jikzvyas1E9FJPgE\n4/4mWiO0h/RZDZQkNIx6XJ65CsA1OdhxvdEeFc2mLY70NRNX0EWV52/ZAoGAZT4Y\nZ8tWiJcfyrhhX0wTe9XHE7GMYaCoElKcHhq9l7ggrfztaI2Y+f+91E1GN+1tuczZ\nFuf4kybndMZqd2y4JUXbttmjhvG/kc6gRzfnURUwuIKSsK65CN+A3sv18D465lFh\nPK+6BbH9GLlSFeAB5shfu5ViX6BoZXARmgdQrZECgYEAhHcVm91W+oJ8A7r1mkWw\nfPeSYsbFG2NqYr4XT4oZUrdbhK3IRf8FZnLp8Y1U27DdwQmr8NKV9Zwznfee+gFx\nBJk7Wo0L+DhYKTE+ekOEdmAZBEXghDWPbeEZwYxg6sZQyr63gGz/3P//RcjKdv53\nbQgLJcu7bjFMmVKrDG0y/eo=\n-----END PRIVATE KEY-----\n";

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "legistrac",
      clientEmail: "firebase-adminsdk-fbsvc@legistrac.iam.gserviceaccount.com",
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const app = getAdminApp();
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
