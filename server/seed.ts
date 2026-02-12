import { db } from "./db";
import { attendants, clients, conversations, messages, quickReplies, products, activities } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const [existing] = await db.select({ count: sql<number>`count(*)::int` }).from(clients);
  if (existing && existing.count > 0) return;

  const [att1] = await db.insert(attendants).values([
    { name: "Suellen", email: "suellen@oticasuellen.com", status: "online" },
    { name: "Carlos", email: "carlos@oticasuellen.com", status: "online" },
    { name: "Mariana", email: "mariana@oticasuellen.com", status: "away" },
  ]).returning();

  const clientsData = await db.insert(clients).values([
    { name: "Ana Paula Silva", phone: "(11) 98765-4321", email: "ana.silva@gmail.com", notes: "Preferência por armações finas", lastContact: new Date(Date.now() - 3600000) },
    { name: "Roberto Mendes", phone: "(11) 97654-3210", email: "roberto.m@outlook.com", notes: "Grau alto, precisa de lentes especiais", lastContact: new Date(Date.now() - 7200000) },
    { name: "Fernanda Costa", phone: "(11) 96543-2109", email: "fer.costa@gmail.com", lastContact: new Date(Date.now() - 86400000) },
    { name: "Lucas Oliveira", phone: "(11) 95432-1098", email: "lucas.o@hotmail.com", notes: "Interesse em óculos de sol", lastContact: new Date(Date.now() - 172800000) },
    { name: "Juliana Santos", phone: "(11) 94321-0987", email: "ju.santos@gmail.com", lastContact: new Date(Date.now() - 259200000) },
  ]).returning();

  const now = new Date();
  const convsData = await db.insert(conversations).values([
    { clientId: clientsData[0].id, attendantId: att1.id, status: "em_atendimento", startedAt: new Date(now.getTime() - 1800000) },
    { clientId: clientsData[1].id, attendantId: att1.id, status: "nova", startedAt: new Date(now.getTime() - 3600000) },
    { clientId: clientsData[2].id, status: "nova", startedAt: new Date(now.getTime() - 5400000) },
    { clientId: clientsData[3].id, attendantId: att1.id, status: "finalizada", startedAt: new Date(now.getTime() - 86400000), endedAt: new Date(now.getTime() - 82800000), duration: 60 },
    { clientId: clientsData[4].id, attendantId: att1.id, status: "finalizada", startedAt: new Date(now.getTime() - 172800000), endedAt: new Date(now.getTime() - 169200000), duration: 45 },
    { clientId: clientsData[0].id, status: "pausada", startedAt: new Date(now.getTime() - 43200000) },
    { clientId: clientsData[1].id, attendantId: att1.id, status: "finalizada", startedAt: new Date(now.getTime() - 259200000), endedAt: new Date(now.getTime() - 255600000), duration: 30 },
    { clientId: clientsData[2].id, attendantId: att1.id, status: "em_atendimento", startedAt: new Date(now.getTime() - 900000) },
  ]).returning();

  await db.insert(messages).values([
    { conversationId: convsData[0].id, sender: "client", content: "Olá, gostaria de saber sobre armações de grau" },
    { conversationId: convsData[0].id, sender: "attendant", content: "Boa tarde, Ana! Temos diversas opções. Qual modelo você prefere?" },
    { conversationId: convsData[0].id, sender: "client", content: "Prefiro algo leve e moderno" },
    { conversationId: convsData[1].id, sender: "client", content: "Bom dia! Preciso fazer um orçamento de lentes progressivas" },
    { conversationId: convsData[2].id, sender: "client", content: "Oi! Vocês trabalham com Ray-Ban?" },
  ]);

  await db.insert(quickReplies).values([
    { title: "Boas-vindas", content: "Olá! Bem-vindo(a) à Ótica Suellen! Como posso ajudá-lo(a) hoje?", category: "saudacao", shortcut: "/ola" },
    { title: "Horário de Funcionamento", content: "Nosso horário de funcionamento é de segunda a sexta, das 8h às 18h, e sábados das 8h às 13h.", category: "geral", shortcut: "/horario" },
    { title: "Agendamento de Consulta", content: "Para agendar uma consulta, preciso do seu nome completo e melhor horário. Temos disponibilidade essa semana!", category: "agendamento", shortcut: "/agendar" },
    { title: "Promoção do Mês", content: "Aproveite nossa promoção: armação + lentes com até 30% de desconto! Válido até o final do mês.", category: "produtos", shortcut: "/promo" },
    { title: "Encerramento", content: "Obrigada por entrar em contato com a Ótica Suellen! Qualquer dúvida, estamos à disposição. Tenha um ótimo dia!", category: "encerramento", shortcut: "/tchau" },
    { title: "Prazos de Entrega", content: "O prazo de entrega dos óculos é de 5 a 7 dias úteis após a confirmação do pedido.", category: "geral", shortcut: "/prazo" },
  ]);

  await db.insert(products).values([
    { name: "Armação Ray-Ban RB7047", description: "Armação retangular em acetato, confortável e leve", price: 45000, category: "armacoes", stock: 12 },
    { name: "Lente Multifocal Varilux", description: "Lente progressiva com tecnologia de visão ampla", price: 89000, category: "lentes", stock: 25 },
    { name: "Óculos de Sol Oakley Holbrook", description: "Óculos esportivo com proteção UV400", price: 65000, category: "solar", stock: 8 },
    { name: "Estojo Rígido Premium", description: "Estojo com fecho magnético e revestimento aveludado", price: 4500, category: "acessorios", stock: 50 },
    { name: "Spray Limpa Lentes 120ml", description: "Solução antirreflexo e antiembaçante para lentes", price: 2500, category: "limpeza", stock: 100 },
    { name: "Armação Chilli Beans Classic", description: "Armação arredondada estilo vintage em metal dourado", price: 28000, category: "armacoes", stock: 15 },
  ]);

  await db.insert(activities).values([
    { type: "nova_conversa", description: "Nova conversa iniciada com Ana Paula Silva", attendantName: "Suellen" },
    { type: "mensagem", description: "Suellen respondeu Ana Paula Silva", attendantName: "Suellen" },
    { type: "nova_conversa", description: "Nova conversa iniciada com Roberto Mendes", attendantName: null },
    { type: "nova_conversa", description: "Nova conversa iniciada com Fernanda Costa", attendantName: null },
    { type: "finalizacao", description: "Conversa com Lucas Oliveira foi finalizada", attendantName: "Suellen" },
    { type: "novo_cliente", description: "Novo cliente cadastrado: Juliana Santos", attendantName: "Carlos" },
    { type: "transferencia", description: "Conversa transferida de Mariana para Suellen", attendantName: "Mariana" },
    { type: "mensagem", description: "Suellen enviou promoção para Fernanda Costa", attendantName: "Suellen" },
  ]);

  console.log("Database seeded successfully");
}
