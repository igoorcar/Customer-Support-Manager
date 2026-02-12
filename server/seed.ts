import { db } from "./db";
import { attendants, clients, conversations, messages, quickReplies, products, activities, clientNotes } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const [existing] = await db.select({ count: sql<number>`count(*)::int` }).from(clients);
  if (existing && existing.count > 0) return;

  const atts = await db.insert(attendants).values([
    { name: "Suellen", email: "suellen@oticasuellen.com", status: "online" },
    { name: "Carlos", email: "carlos@oticasuellen.com", status: "online" },
    { name: "Mariana", email: "mariana@oticasuellen.com", status: "away" },
    { name: "Juliana", email: "juliana@oticasuellen.com", status: "offline" },
  ]).returning();

  const now = new Date();
  const day = 86400000;

  const clientsData = await db.insert(clients).values([
    { name: "Ana Paula Silva", phone: "(11) 98765-4321", email: "ana.silva@gmail.com", notes: "Preferência por armações finas", tags: ["miopia", "armações"], vip: true, status: "ativo", totalSpend: 245000, purchaseCount: 5, lastPurchaseAt: new Date(now.getTime() - 15 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 3600000), gender: "feminino" },
    { name: "Roberto Mendes", phone: "(11) 97654-3210", email: "roberto.m@outlook.com", notes: "Grau alto, precisa de lentes especiais", tags: ["grau alto", "lentes progressivas"], vip: false, status: "ativo", totalSpend: 189000, purchaseCount: 3, lastPurchaseAt: new Date(now.getTime() - 30 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 7200000), gender: "masculino" },
    { name: "Fernanda Costa", phone: "(11) 96543-2109", email: "fer.costa@gmail.com", tags: ["solar", "esportivo"], vip: false, status: "ativo", totalSpend: 65000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 60 * day), channel: "loja", city: "Guarulhos", state: "SP", lastContact: new Date(now.getTime() - day), gender: "feminino" },
    { name: "Lucas Oliveira", phone: "(11) 95432-1098", email: "lucas.o@hotmail.com", notes: "Interesse em óculos de sol", tags: ["solar"], vip: false, status: "ativo", totalSpend: 45000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 90 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 2 * day), gender: "masculino" },
    { name: "Juliana Santos", phone: "(11) 94321-0987", email: "ju.santos@gmail.com", tags: ["presbiopia", "multifocal"], vip: true, status: "ativo", totalSpend: 520000, purchaseCount: 8, lastPurchaseAt: new Date(now.getTime() - 7 * day), channel: "whatsapp", city: "Osasco", state: "SP", lastContact: new Date(now.getTime() - 3 * day), gender: "feminino" },
    { name: "Carlos Eduardo Pereira", phone: "(11) 93210-9876", email: "carlos.ep@gmail.com", tags: ["miopia", "astigmatismo"], vip: false, status: "ativo", totalSpend: 120000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 45 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 5 * day), gender: "masculino" },
    { name: "Maria Aparecida Lima", phone: "(11) 92109-8765", email: "maria.lima@yahoo.com", tags: ["presbiopia", "lentes de contato"], vip: true, status: "ativo", totalSpend: 890000, purchaseCount: 12, lastPurchaseAt: new Date(now.getTime() - 10 * day), channel: "loja", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 2 * day), gender: "feminino" },
    { name: "Pedro Henrique Souza", phone: "(11) 91098-7654", email: "pedro.hs@gmail.com", tags: ["esportivo", "solar"], vip: false, status: "ativo", totalSpend: 78000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 20 * day), channel: "whatsapp", city: "Barueri", state: "SP", lastContact: new Date(now.getTime() - 4 * day), gender: "masculino" },
    { name: "Beatriz Ferreira", phone: "(11) 90987-6543", email: "bia.ferreira@gmail.com", tags: ["infantil", "miopia"], vip: false, status: "ativo", totalSpend: 35000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 100 * day), channel: "site", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 8 * day), gender: "feminino" },
    { name: "André Luiz Costa", phone: "(11) 99876-5432", email: "andre.costa@empresa.com", tags: ["grau alto", "multifocal"], vip: false, status: "ativo", totalSpend: 156000, purchaseCount: 3, lastPurchaseAt: new Date(now.getTime() - 25 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 6 * day), gender: "masculino" },
    { name: "Camila Rodrigues", phone: "(11) 98765-1234", email: "camila.r@hotmail.com", tags: ["solar", "armações"], vip: false, status: "ativo", totalSpend: 98000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 35 * day), channel: "whatsapp", city: "Santo André", state: "SP", lastContact: new Date(now.getTime() - 10 * day), gender: "feminino" },
    { name: "Ricardo Almeida", phone: "(11) 97654-5678", email: "ricardo.a@gmail.com", tags: ["miopia"], vip: false, status: "inativo", totalSpend: 32000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 200 * day), channel: "loja", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 60 * day), gender: "masculino" },
    { name: "Patrícia Nunes", phone: "(11) 96543-9012", email: "patricia.n@outlook.com", tags: ["presbiopia", "armações"], vip: true, status: "ativo", totalSpend: 450000, purchaseCount: 7, lastPurchaseAt: new Date(now.getTime() - 5 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - day), gender: "feminino" },
    { name: "Marcos Vinícius Santos", phone: "(11) 95432-3456", email: "marcos.vs@gmail.com", tags: ["esportivo"], vip: false, status: "ativo", totalSpend: 65000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 50 * day), channel: "indicacao", city: "Guarulhos", state: "SP", lastContact: new Date(now.getTime() - 12 * day), gender: "masculino" },
    { name: "Gabriela Martins", phone: "(11) 94321-7890", email: "gabi.martins@gmail.com", tags: ["lentes de contato", "miopia"], vip: false, status: "ativo", totalSpend: 210000, purchaseCount: 6, lastPurchaseAt: new Date(now.getTime() - 8 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 3 * day), gender: "feminino" },
    { name: "Thiago Barbosa", phone: "(11) 93210-2345", email: "thiago.b@empresa.com", tags: ["solar", "grau alto"], vip: false, status: "ativo", totalSpend: 145000, purchaseCount: 3, lastPurchaseAt: new Date(now.getTime() - 40 * day), channel: "whatsapp", city: "São Bernardo", state: "SP", lastContact: new Date(now.getTime() - 15 * day), gender: "masculino" },
    { name: "Larissa Gomes", phone: "(11) 92109-6789", email: "larissa.g@gmail.com", tags: ["infantil"], vip: false, status: "ativo", totalSpend: 28000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 70 * day), channel: "site", city: "Mogi das Cruzes", state: "SP", lastContact: new Date(now.getTime() - 20 * day), gender: "feminino" },
    { name: "Fernando Araújo", phone: "(11) 91098-0123", email: "fernando.a@outlook.com", tags: ["multifocal", "astigmatismo"], vip: true, status: "ativo", totalSpend: 680000, purchaseCount: 10, lastPurchaseAt: new Date(now.getTime() - 3 * day), channel: "loja", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - day), gender: "masculino" },
    { name: "Aline Ribeiro", phone: "(11) 90987-4567", email: "aline.r@gmail.com", tags: ["solar", "armações"], vip: false, status: "ativo", totalSpend: 55000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 80 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 25 * day), gender: "feminino" },
    { name: "José Carlos Freitas", phone: "(11) 99765-4321", email: "jose.cf@gmail.com", tags: ["presbiopia"], vip: false, status: "ativo", totalSpend: 95000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 55 * day), channel: "loja", city: "Taboão da Serra", state: "SP", lastContact: new Date(now.getTime() - 18 * day), gender: "masculino" },
    { name: "Renata Oliveira", phone: "(11) 98654-3210", email: "renata.o@hotmail.com", tags: ["lentes de contato"], vip: false, status: "ativo", totalSpend: 175000, purchaseCount: 4, lastPurchaseAt: new Date(now.getTime() - 12 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 4 * day), gender: "feminino" },
    { name: "Diego Mendonça", phone: "(11) 97543-2109", email: "diego.m@empresa.com", tags: ["esportivo", "solar"], vip: false, status: "ativo", totalSpend: 130000, purchaseCount: 3, lastPurchaseAt: new Date(now.getTime() - 22 * day), channel: "indicacao", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 7 * day), gender: "masculino" },
    { name: "Vanessa Cardoso", phone: "(11) 96432-1098", email: "vanessa.c@gmail.com", tags: ["miopia", "armações"], vip: false, status: "ativo", totalSpend: 82000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 65 * day), channel: "whatsapp", city: "Cotia", state: "SP", lastContact: new Date(now.getTime() - 14 * day), gender: "feminino" },
    { name: "Eduardo Nascimento", phone: "(11) 95321-0987", email: "edu.n@outlook.com", tags: ["grau alto"], vip: false, status: "inativo", totalSpend: 0, purchaseCount: 0, channel: "site", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 90 * day), gender: "masculino" },
    { name: "Isabela Moreira", phone: "(11) 94210-9876", email: "isabela.m@gmail.com", tags: ["solar", "lentes de contato"], vip: false, status: "ativo", totalSpend: 310000, purchaseCount: 5, lastPurchaseAt: new Date(now.getTime() - 6 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 2 * day), gender: "feminino" },
    { name: "Rafael Pinto", phone: "(11) 93109-8765", email: "rafael.p@gmail.com", tags: ["astigmatismo", "armações"], vip: false, status: "ativo", totalSpend: 67000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 110 * day), channel: "loja", city: "Diadema", state: "SP", lastContact: new Date(now.getTime() - 30 * day), gender: "masculino" },
    { name: "Débora Campos", phone: "(11) 92098-7654", email: "debora.c@hotmail.com", tags: ["presbiopia", "multifocal"], vip: true, status: "ativo", totalSpend: 720000, purchaseCount: 11, lastPurchaseAt: new Date(now.getTime() - 4 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - day), gender: "feminino" },
    { name: "Guilherme Teixeira", phone: "(11) 91087-6543", email: "gui.t@empresa.com", tags: ["esportivo"], vip: false, status: "ativo", totalSpend: 43000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 75 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 22 * day), gender: "masculino" },
    { name: "Tatiane Lopes", phone: "(11) 90976-5432", email: "tati.l@gmail.com", tags: ["infantil", "miopia"], vip: false, status: "ativo", totalSpend: 52000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 28 * day), channel: "indicacao", city: "Carapicuíba", state: "SP", lastContact: new Date(now.getTime() - 9 * day), gender: "feminino" },
    { name: "Mateus Correia", phone: "(11) 99654-3210", email: "mateus.c@outlook.com", tags: ["solar"], vip: false, status: "ativo", totalSpend: 38000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 95 * day), channel: "site", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 35 * day), gender: "masculino" },
    { name: "Priscila Rocha", phone: "(11) 98543-2109", email: "pri.rocha@gmail.com", tags: ["armações", "lentes de contato"], vip: false, status: "ativo", totalSpend: 198000, purchaseCount: 4, lastPurchaseAt: new Date(now.getTime() - 14 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 5 * day), gender: "feminino" },
    { name: "Leandro Silva", phone: "(11) 97432-1098", email: "leandro.s@gmail.com", tags: ["grau alto", "astigmatismo"], vip: false, status: "ativo", totalSpend: 230000, purchaseCount: 4, lastPurchaseAt: new Date(now.getTime() - 18 * day), channel: "loja", city: "Itaquaquecetuba", state: "SP", lastContact: new Date(now.getTime() - 6 * day), gender: "masculino" },
    { name: "Simone Azevedo", phone: "(11) 96321-0987", email: "simone.a@hotmail.com", tags: ["multifocal"], vip: false, status: "inativo", totalSpend: 89000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 180 * day), channel: "loja", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 80 * day), gender: "feminino" },
    { name: "Bruno Machado", phone: "(11) 95210-9876", email: "bruno.m@empresa.com", tags: ["esportivo", "solar"], vip: false, status: "ativo", totalSpend: 115000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 32 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 11 * day), gender: "masculino" },
    { name: "Adriana Duarte", phone: "(11) 94109-8765", email: "adriana.d@gmail.com", tags: ["presbiopia", "armações"], vip: false, status: "ativo", totalSpend: 145000, purchaseCount: 3, lastPurchaseAt: new Date(now.getTime() - 20 * day), channel: "whatsapp", city: "Suzano", state: "SP", lastContact: new Date(now.getTime() - 7 * day), gender: "feminino" },
    { name: "Rodrigo Monteiro", phone: "(11) 93098-7654", email: "rodrigo.m@outlook.com", tags: ["solar"], vip: false, status: "ativo", totalSpend: 0, purchaseCount: 0, channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 2 * day), gender: "masculino" },
    { name: "Cláudia Fonseca", phone: "(11) 92087-6543", email: "claudia.f@gmail.com", tags: ["miopia", "lentes de contato"], vip: true, status: "ativo", totalSpend: 560000, purchaseCount: 9, lastPurchaseAt: new Date(now.getTime() - 8 * day), channel: "loja", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 3 * day), gender: "feminino" },
    { name: "Henrique Bastos", phone: "(11) 91076-5432", email: "henrique.b@gmail.com", tags: ["astigmatismo"], vip: false, status: "ativo", totalSpend: 72000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 42 * day), channel: "site", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 16 * day), gender: "masculino" },
    { name: "Marcela Cunha", phone: "(11) 90965-4321", email: "marcela.c@hotmail.com", tags: ["infantil", "armações"], vip: false, status: "ativo", totalSpend: 48000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 38 * day), channel: "indicacao", city: "Ferraz de Vasconcelos", state: "SP", lastContact: new Date(now.getTime() - 13 * day), gender: "feminino" },
    { name: "Fábio Ramos", phone: "(11) 99543-2109", email: "fabio.r@empresa.com", tags: ["grau alto", "multifocal"], vip: false, status: "ativo", totalSpend: 195000, purchaseCount: 3, lastPurchaseAt: new Date(now.getTime() - 15 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 5 * day), gender: "masculino" },
    { name: "Luciana Barros", phone: "(11) 98432-1098", email: "luciana.b@gmail.com", tags: ["solar", "armações"], vip: false, status: "ativo", totalSpend: 88000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 48 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 17 * day), gender: "feminino" },
    { name: "Vinícius Carvalho", phone: "(11) 97321-0987", email: "vinicius.c@outlook.com", tags: ["esportivo"], vip: false, status: "inativo", totalSpend: 25000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 250 * day), channel: "loja", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 100 * day), gender: "masculino" },
    { name: "Elaine Tavares", phone: "(11) 96210-9876", email: "elaine.t@gmail.com", tags: ["presbiopia"], vip: false, status: "ativo", totalSpend: 135000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 22 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 8 * day), gender: "feminino" },
    { name: "Alexandre Moura", phone: "(11) 95109-8765", email: "alex.moura@gmail.com", tags: ["miopia", "armações"], vip: false, status: "ativo", totalSpend: 110000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 28 * day), channel: "indicacao", city: "Embu das Artes", state: "SP", lastContact: new Date(now.getTime() - 10 * day), gender: "masculino" },
    { name: "Rosana Pires", phone: "(11) 94098-7654", email: "rosana.p@hotmail.com", tags: ["multifocal", "lentes de contato"], vip: true, status: "ativo", totalSpend: 980000, purchaseCount: 15, lastPurchaseAt: new Date(now.getTime() - 2 * day), channel: "loja", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - day), gender: "feminino" },
    { name: "Daniel Medeiros", phone: "(11) 93087-6543", email: "daniel.m@empresa.com", tags: ["solar", "esportivo"], vip: false, status: "ativo", totalSpend: 92000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 35 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 12 * day), gender: "masculino" },
    { name: "Cristiane Vieira", phone: "(11) 92076-5432", email: "cris.vieira@gmail.com", tags: ["astigmatismo", "armações"], vip: false, status: "ativo", totalSpend: 158000, purchaseCount: 3, lastPurchaseAt: new Date(now.getTime() - 16 * day), channel: "whatsapp", city: "Poá", state: "SP", lastContact: new Date(now.getTime() - 6 * day), gender: "feminino" },
    { name: "Sérgio Andrade", phone: "(11) 91065-4321", email: "sergio.a@outlook.com", tags: ["grau alto"], vip: false, status: "ativo", totalSpend: 75000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 58 * day), channel: "site", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 19 * day), gender: "masculino" },
    { name: "Natália Castro", phone: "(11) 90954-3210", email: "natalia.c@gmail.com", tags: ["solar", "lentes de contato"], vip: false, status: "ativo", totalSpend: 265000, purchaseCount: 5, lastPurchaseAt: new Date(now.getTime() - 9 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 3 * day), gender: "feminino" },
    { name: "Márcio Gonçalves", phone: "(11) 99432-1098", email: "marcio.g@gmail.com", tags: ["presbiopia", "multifocal"], vip: false, status: "ativo", totalSpend: 180000, purchaseCount: 3, lastPurchaseAt: new Date(now.getTime() - 24 * day), channel: "loja", city: "Itapecerica da Serra", state: "SP", lastContact: new Date(now.getTime() - 9 * day), gender: "masculino" },
    { name: "Carla Regina Dias", phone: "(11) 98321-0987", email: "carla.rd@hotmail.com", tags: ["infantil", "miopia"], vip: false, status: "ativo", totalSpend: 42000, purchaseCount: 1, lastPurchaseAt: new Date(now.getTime() - 85 * day), channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 28 * day), gender: "feminino" },
    { name: "Wagner Souza Lima", phone: "(11) 97210-9876", email: "wagner.sl@empresa.com", tags: ["esportivo", "solar"], vip: false, status: "ativo", totalSpend: 0, purchaseCount: 0, channel: "whatsapp", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - day), gender: "masculino" },
    { name: "Sandra Melo", phone: "(11) 96109-8765", email: "sandra.m@gmail.com", tags: ["armações", "presbiopia"], vip: false, status: "ativo", totalSpend: 125000, purchaseCount: 2, lastPurchaseAt: new Date(now.getTime() - 30 * day), channel: "loja", city: "São Paulo", state: "SP", lastContact: new Date(now.getTime() - 11 * day), gender: "feminino" },
  ]).returning();

  const convsData = await db.insert(conversations).values([
    { clientId: clientsData[0].id, attendantId: atts[0].id, status: "em_atendimento", startedAt: new Date(now.getTime() - 1800000) },
    { clientId: clientsData[1].id, attendantId: atts[0].id, status: "nova", startedAt: new Date(now.getTime() - 3600000) },
    { clientId: clientsData[2].id, status: "nova", startedAt: new Date(now.getTime() - 5400000) },
    { clientId: clientsData[3].id, attendantId: atts[0].id, status: "finalizada", startedAt: new Date(now.getTime() - day), endedAt: new Date(now.getTime() - day + 3600000), duration: 60, finishReason: "atendido" },
    { clientId: clientsData[4].id, attendantId: atts[0].id, status: "finalizada", startedAt: new Date(now.getTime() - 2 * day), endedAt: new Date(now.getTime() - 2 * day + 2700000), duration: 45, finishReason: "atendido" },
    { clientId: clientsData[0].id, status: "pausada", startedAt: new Date(now.getTime() - 43200000) },
    { clientId: clientsData[1].id, attendantId: atts[0].id, status: "finalizada", startedAt: new Date(now.getTime() - 3 * day), endedAt: new Date(now.getTime() - 3 * day + 1800000), duration: 30, finishReason: "atendido" },
    { clientId: clientsData[2].id, attendantId: atts[1].id, status: "em_atendimento", startedAt: new Date(now.getTime() - 900000) },
    { clientId: clientsData[5].id, attendantId: atts[1].id, status: "em_atendimento", startedAt: new Date(now.getTime() - 2400000) },
    { clientId: clientsData[6].id, attendantId: atts[0].id, status: "nova", startedAt: new Date(now.getTime() - 600000) },
    { clientId: clientsData[12].id, attendantId: atts[0].id, status: "em_atendimento", startedAt: new Date(now.getTime() - 1200000) },
    { clientId: clientsData[17].id, status: "nova", startedAt: new Date(now.getTime() - 7200000) },
  ]).returning();

  await db.insert(messages).values([
    { conversationId: convsData[0].id, sender: "client", content: "Olá, gostaria de saber sobre armações de grau", type: "text", status: "read" },
    { conversationId: convsData[0].id, sender: "attendant", content: "Boa tarde, Ana! Temos diversas opções. Qual modelo você prefere?", type: "text", status: "read" },
    { conversationId: convsData[0].id, sender: "client", content: "Prefiro algo leve e moderno", type: "text", status: "read" },
    { conversationId: convsData[0].id, sender: "attendant", content: "Temos a linha Ray-Ban RB7047, muito leve e moderna. Preço a partir de R$ 450,00", type: "text", status: "delivered" },
    { conversationId: convsData[0].id, sender: "client", content: "Que legal! Tem foto?", type: "text", status: "read" },
    { conversationId: convsData[0].id, sender: "attendant", content: "Claro! Segue as fotos dos modelos disponíveis", type: "text", status: "delivered" },
    { conversationId: convsData[1].id, sender: "client", content: "Bom dia! Preciso fazer um orçamento de lentes progressivas", type: "text", status: "read" },
    { conversationId: convsData[1].id, sender: "client", content: "Meu grau é bem alto, -5.50 com astigmatismo", type: "text", status: "read" },
    { conversationId: convsData[2].id, sender: "client", content: "Oi! Vocês trabalham com Ray-Ban?", type: "text", status: "sent" },
    { conversationId: convsData[7].id, sender: "client", content: "Boa tarde! Queria saber sobre óculos esportivos", type: "text", status: "read" },
    { conversationId: convsData[7].id, sender: "attendant", content: "Olá Fernanda! Temos a linha Oakley e também opções mais acessíveis. O que procura?", type: "text", status: "delivered" },
    { conversationId: convsData[7].id, sender: "client", content: "Algo pra corrida, com proteção UV", type: "text", status: "read" },
    { conversationId: convsData[8].id, sender: "client", content: "Olá! Vi que vocês tem promoção de armações", type: "text", status: "read" },
    { conversationId: convsData[8].id, sender: "attendant", content: "Sim! Temos armação + lentes com até 30% de desconto. Válido até o final do mês!", type: "text", status: "delivered" },
    { conversationId: convsData[9].id, sender: "client", content: "Boa noite! Preciso trocar minhas lentes multifocais", type: "text", status: "sent" },
    { conversationId: convsData[10].id, sender: "client", content: "Olá, queria ver preços de óculos de sol femininos", type: "text", status: "read" },
    { conversationId: convsData[10].id, sender: "attendant", content: "Boa tarde! Temos modelos lindos! Qual estilo você gosta?", type: "text", status: "read" },
    { conversationId: convsData[10].id, sender: "client", content: "Gosto de modelos gatinho ou redondos", type: "text", status: "read" },
    { conversationId: convsData[11].id, sender: "client", content: "Oi, vocês fazem lentes com tratamento antirreflexo?", type: "text", status: "sent" },
  ]);

  await db.insert(quickReplies).values([
    { title: "Boas-vindas", content: "Olá! Bem-vindo(a) à Ótica Suellen! Como posso ajudá-lo(a) hoje?", category: "saudacao", shortcut: "/ola", active: true, sortOrder: 1, usageCount: 145 },
    { title: "Horário de Funcionamento", content: "Nosso horário de funcionamento é de segunda a sexta, das 8h às 18h, e sábados das 8h às 13h.", category: "geral", shortcut: "/horario", active: true, sortOrder: 2, usageCount: 89 },
    { title: "Agendamento de Consulta", content: "Para agendar uma consulta, preciso do seu nome completo e melhor horário. Temos disponibilidade essa semana!", category: "agendamento", shortcut: "/agendar", active: true, sortOrder: 3, usageCount: 67 },
    { title: "Promoção do Mês", content: "Aproveite nossa promoção: armação + lentes com até 30% de desconto! Válido até o final do mês.", category: "produtos", shortcut: "/promo", active: true, sortOrder: 4, usageCount: 112 },
    { title: "Encerramento", content: "Obrigada por entrar em contato com a Ótica Suellen! Qualquer dúvida, estamos à disposição. Tenha um ótimo dia!", category: "encerramento", shortcut: "/tchau", active: true, sortOrder: 5, usageCount: 156 },
    { title: "Prazos de Entrega", content: "O prazo de entrega dos óculos é de 5 a 7 dias úteis após a confirmação do pedido.", category: "geral", shortcut: "/prazo", active: true, sortOrder: 6, usageCount: 45 },
    { title: "Formas de Pagamento", content: "Aceitamos cartão de crédito (até 10x sem juros), débito, PIX e dinheiro. Para PIX, temos 5% de desconto!", category: "precos", shortcut: "/pag", active: true, sortOrder: 7, usageCount: 98 },
    { title: "Catálogo de Armações", content: "Temos armações de diversas marcas: Ray-Ban, Oakley, Chilli Beans, Ana Hickmann e muito mais! Quer ver alguma marca específica?", category: "produtos", shortcut: "/cat", active: true, sortOrder: 8, usageCount: 76 },
    { title: "Garantia", content: "Todos os nossos produtos possuem garantia de 1 ano contra defeitos de fabricação. Lentes têm garantia de adaptação de 30 dias.", category: "geral", shortcut: "/garantia", active: true, sortOrder: 9, usageCount: 34 },
    { title: "Localização", content: "Estamos localizados na Rua das Flores, 123 - Centro. Próximo ao Shopping Central. Fácil acesso por transporte público!", category: "geral", shortcut: "/local", active: true, sortOrder: 10, usageCount: 52 },
    { title: "Lentes de Contato", content: "Trabalhamos com lentes de contato descartáveis e de uso prolongado. Marcas: Acuvue, Bausch+Lomb, CooperVision. Precisa de receita atualizada!", category: "produtos", shortcut: "/lente", active: true, sortOrder: 11, usageCount: 41 },
    { title: "Consulta Oftalmológica", content: "Temos parceria com oftalmologistas! Consultas a partir de R$ 120,00. Posso agendar para você?", category: "agendamento", shortcut: "/oftalmo", active: true, sortOrder: 12, usageCount: 29 },
    { title: "Obrigado pelo interesse", content: "Agradecemos seu interesse! Quando decidir, é só nos chamar. Estamos sempre à disposição!", category: "encerramento", shortcut: "/obrigado", active: true, sortOrder: 13, usageCount: 88 },
    { title: "Promoção Lentes", content: "Promoção especial de lentes! Multifocal Varilux com 20% de desconto. Consulte condições!", category: "precos", shortcut: "/promolente", active: false, sortOrder: 14, usageCount: 15 },
  ]);

  await db.insert(products).values([
    { name: "Armação Ray-Ban RB7047", description: "Armação retangular em acetato, confortável e leve", price: 45000, category: "armacoes", stock: 12 },
    { name: "Lente Multifocal Varilux", description: "Lente progressiva com tecnologia de visão ampla", price: 89000, category: "lentes", stock: 25 },
    { name: "Óculos de Sol Oakley Holbrook", description: "Óculos esportivo com proteção UV400", price: 65000, category: "solar", stock: 8 },
    { name: "Estojo Rígido Premium", description: "Estojo com fecho magnético e revestimento aveludado", price: 4500, category: "acessorios", stock: 50 },
    { name: "Spray Limpa Lentes 120ml", description: "Solução antirreflexo e antiembaçante para lentes", price: 2500, category: "limpeza", stock: 100 },
    { name: "Armação Chilli Beans Classic", description: "Armação arredondada estilo vintage em metal dourado", price: 28000, category: "armacoes", stock: 15 },
    { name: "Lente Transitions", description: "Lente fotossensível que escurece no sol automaticamente", price: 55000, category: "lentes", stock: 30 },
    { name: "Armação Ana Hickmann AH1234", description: "Armação feminina elegante em acetato bordô", price: 38000, category: "armacoes", stock: 10 },
    { name: "Óculos de Sol Ray-Ban Aviator", description: "Clássico óculos aviador com lentes polarizadas", price: 75000, category: "solar", stock: 6 },
    { name: "Lente de Contato Acuvue Oasys", description: "Lente de contato quinzenal para miopia e astigmatismo", price: 18000, category: "lentes", stock: 40 },
    { name: "Cordão para Óculos", description: "Cordão salva-óculos em corrente dourada", price: 3500, category: "acessorios", stock: 35 },
    { name: "Flanela de Microfibra", description: "Flanela premium para limpeza de lentes", price: 1500, category: "limpeza", stock: 200 },
  ]);

  await db.insert(activities).values([
    { type: "nova_conversa", description: "Nova conversa iniciada com Ana Paula Silva", attendantName: "Suellen" },
    { type: "mensagem", description: "Suellen respondeu Ana Paula Silva", attendantName: "Suellen" },
    { type: "nova_conversa", description: "Nova conversa iniciada com Roberto Mendes" },
    { type: "nova_conversa", description: "Nova conversa iniciada com Fernanda Costa" },
    { type: "finalizacao", description: "Conversa com Lucas Oliveira foi finalizada", attendantName: "Suellen" },
    { type: "novo_cliente", description: "Novo cliente cadastrado: Juliana Santos", attendantName: "Carlos" },
    { type: "transferencia", description: "Conversa transferida de Mariana para Suellen", attendantName: "Mariana" },
    { type: "mensagem", description: "Suellen enviou promoção para Fernanda Costa", attendantName: "Suellen" },
    { type: "nova_conversa", description: "Nova conversa com Patrícia Nunes", attendantName: "Suellen" },
    { type: "mensagem", description: "Carlos respondeu Carlos Eduardo Pereira", attendantName: "Carlos" },
  ]);

  await db.insert(clientNotes).values([
    { clientId: clientsData[0].id, content: "Cliente VIP, sempre paga à vista. Prefere armações finas e leves.", author: "Suellen" },
    { clientId: clientsData[0].id, content: "Indicou 3 clientes novos no último mês.", author: "Carlos" },
    { clientId: clientsData[4].id, content: "Compra lentes multifocais regularmente a cada 6 meses.", author: "Suellen" },
    { clientId: clientsData[6].id, content: "Cliente muito fiel, sempre traz a família. Usa lentes de contato diárias.", author: "Mariana" },
    { clientId: clientsData[12].id, content: "Gosta de promoções, sempre pergunta sobre descontos.", author: "Carlos" },
  ]);

  console.log("Database seeded successfully");
}
