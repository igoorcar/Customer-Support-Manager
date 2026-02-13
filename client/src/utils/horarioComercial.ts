export interface Feriado {
  data: string;
  nome: string;
}

export const feriados2026: Feriado[] = [
  { data: '2026-01-01', nome: 'Confraternização Universal' },
  { data: '2026-02-16', nome: 'Carnaval' },
  { data: '2026-02-17', nome: 'Carnaval' },
  { data: '2026-04-03', nome: 'Sexta-feira Santa' },
  { data: '2026-04-21', nome: 'Tiradentes' },
  { data: '2026-05-01', nome: 'Dia do Trabalho' },
  { data: '2026-06-04', nome: 'Corpus Christi' },
  { data: '2026-09-07', nome: 'Independência do Brasil' },
  { data: '2026-10-12', nome: 'Nossa Senhora Aparecida' },
  { data: '2026-11-02', nome: 'Finados' },
  { data: '2026-11-15', nome: 'Proclamação da República' },
  { data: '2026-12-25', nome: 'Natal' }
];

export const horarioComercial = {
  segunda: { inicio: '08:00', fim: '17:00', almoco: { inicio: '13:00', fim: '14:30' } },
  terca: { inicio: '08:00', fim: '17:00', almoco: { inicio: '13:00', fim: '14:30' } },
  quarta: { inicio: '08:00', fim: '17:00', almoco: { inicio: '13:00', fim: '14:30' } },
  quinta: { inicio: '08:00', fim: '17:00', almoco: { inicio: '13:00', fim: '14:30' } },
  sexta: { inicio: '08:00', fim: '17:00', almoco: { inicio: '13:00', fim: '14:30' } },
  sabado: { inicio: '08:30', fim: '12:30', almoco: null },
  domingo: null
};

export const verificarHorarioComercial = (): {
  dentroHorario: boolean;
  motivo: 'horario' | 'feriado' | 'domingo' | 'almoco' | null;
  mensagem?: string;
} => {
  const agora = new Date();
  const diaSemana = agora.getDay();
  const horaAtual = agora.getHours() * 100 + agora.getMinutes();
  const dataHoje = agora.toISOString().split('T')[0];

  const feriado = feriados2026.find(f => f.data === dataHoje);
  if (feriado) {
    return {
      dentroHorario: false,
      motivo: 'feriado',
      mensagem: `Hoje é feriado: ${feriado.nome}`
    };
  }

  if (diaSemana === 0) {
    return {
      dentroHorario: false,
      motivo: 'domingo',
      mensagem: 'Fechado aos domingos'
    };
  }

  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const diaChave = diasSemana[diaSemana] as keyof typeof horarioComercial;
  const horario = horarioComercial[diaChave];

  if (!horario) {
    return {
      dentroHorario: false,
      motivo: 'domingo',
      mensagem: 'Fechado aos domingos'
    };
  }

  if (horario.almoco) {
    const [almocoInicioH, almocoInicioM] = horario.almoco.inicio.split(':').map(Number);
    const [almocoFimH, almocoFimM] = horario.almoco.fim.split(':').map(Number);
    const almocoInicio = almocoInicioH * 100 + almocoInicioM;
    const almocoFim = almocoFimH * 100 + almocoFimM;

    if (horaAtual >= almocoInicio && horaAtual <= almocoFim) {
      return {
        dentroHorario: false,
        motivo: 'almoco',
        mensagem: `Horário de almoço: ${horario.almoco.inicio} às ${horario.almoco.fim}`
      };
    }
  }

  const [inicioH, inicioM] = horario.inicio.split(':').map(Number);
  const [fimH, fimM] = horario.fim.split(':').map(Number);
  const horaInicio = inicioH * 100 + inicioM;
  const horaFim = fimH * 100 + fimM;

  if (horaAtual < horaInicio || horaAtual > horaFim) {
    return {
      dentroHorario: false,
      motivo: 'horario',
      mensagem: `Horário de atendimento: ${horario.inicio} às ${horario.fim}`
    };
  }

  return { dentroHorario: true, motivo: null };
};

export const getMensagemForaHorario = (): string => {
  const status = verificarHorarioComercial();

  if (status.dentroHorario) {
    return 'Estamos em horário de atendimento';
  }

  switch (status.motivo) {
    case 'feriado':
      return status.mensagem || 'Fechado - Feriado';
    case 'domingo':
      return 'Fechado aos domingos';
    case 'almoco':
      return 'Horário de almoço - IA respondendo';
    case 'horario':
      return status.mensagem || 'Fora do horário de atendimento';
    default:
      return 'Fora do horário de atendimento';
  }
};
