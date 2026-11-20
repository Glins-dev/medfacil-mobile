# User Stories — MedFácil Mobile

Formato: **Como** [ator], **quero** [ação] **para que** [valor]. Critérios em BDD (Dado / Quando / Então). RFs em [requisitos.md](requisitos.md).

---

## US01 — Entrar com CPF e senha (RF01, RF02)
**Como** usuário cadastrado, **quero** entrar com meu CPF e senha **para que** eu acesse o MedFácil na tela correta do meu perfil.

- **CA1** — **Dado** que informei CPF válido e senha corretos, **Quando** toco em "Entrar", **Então** sou levado à Home do meu perfil (paciente, médico ou admin) e minha sessão fica salva no dispositivo.
- **CA2** — **Dado** que digitei um CPF inválido, **Quando** toco em "Entrar", **Então** vejo "CPF inválido" junto ao campo e nenhuma requisição é enviada.
- **CA3** — **Dado** que a senha está incorreta, **Quando** toco em "Entrar", **Então** vejo a mensagem retornada pela API e permaneço no Login.
- **CA4** — **Dado** que digito o CPF, **Quando** insiro os números, **Então** o campo aplica a máscara `000.000.000-00` e abre o teclado numérico.

## US02 — Proteção de áreas por perfil (RF02)
**Como** administrador do sistema, **quero** que cada perfil acesse só suas telas **para que** dados e ações administrativas fiquem protegidos.

- **CA1** — **Dado** que sou paciente autenticado, **Quando** tento abrir uma tela de admin, **Então** sou redirecionado à Home do paciente.
- **CA2** — **Dado** que não há sessão, **Quando** abro qualquer tela protegida, **Então** sou levado ao Login.
- **CA3** — **Dado** que o app foi reaberto com sessão salva, **Quando** a hidratação termina, **Então** vou direto à minha Home sem ver o Login.

## US03 — Sair do aplicativo (RF03)
**Como** usuário, **quero** sair da minha conta **para que** outra pessoa não acesse meus dados no mesmo aparelho.

- **CA1** — **Dado** que estou logado, **Quando** toco em "Sair", **Então** token, usuário e cache de consultas são apagados e vejo o Login.
- **CA2** — **Dado** que estou sem internet, **Quando** toco em "Sair", **Então** o logout local acontece mesmo assim.
- **CA3** — **Dado** que a API retornou `401` em qualquer requisição, **Quando** a resposta chega, **Então** a sessão é limpa e sou levado ao Login.

## US04 — Criar conta de paciente (RF04)
**Como** visitante, **quero** me cadastrar informando meus dados **para que** eu possa marcar consultas.

- **CA1** — **Dado** que preenchi todos os campos válidos, **Quando** toco em "Criar conta", **Então** a conta é criada como paciente e entro logado na Home.
- **CA2** — **Dado** que o CPF é inválido (dígitos verificadores ou sequência repetida), **Quando** toco em "Criar conta", **Então** vejo "CPF inválido." e nada é enviado.
- **CA3** — **Dado** que a senha tem menos de 8 caracteres, **Quando** envio, **Então** vejo "Mínimo de 8 caracteres.".
- **CA4** — **Dado** que a data de nascimento é futura, anterior a 1900 ou inexistente, **Quando** envio, **Então** vejo "Use o formato DD/MM/AAAA.".
- **CA5** — **Dado** que o CPF ou e-mail já existe, **Quando** envio, **Então** vejo "CPF ou e-mail já cadastrado." e meus dados continuam preenchidos.

## US05 — Ver minha próxima consulta (RF05)
**Como** paciente, **quero** ver minha próxima consulta ao abrir o app **para que** eu não esqueça o dia e horário.

- **CA1** — **Dado** que tenho consulta futura, **Quando** abro a Home, **Então** vejo dia, mês, horário, especialidade e médico da mais próxima.
- **CA2** — **Dado** que não tenho consultas, **Quando** abro a Home, **Então** vejo "Você ainda não tem consultas marcadas" com atalho para agendar.
- **CA3** — **Dado** que a requisição falhou, **Quando** a Home carrega, **Então** vejo mensagem de erro e "Tentar novamente".

## US06 — Agendar consulta em etapas (RF06)
**Como** paciente, **quero** escolher especialidade, médico, data e horário **para que** eu marque a consulta sem ajuda de terceiros.

- **CA1** — **Dado** que iniciei o agendamento, **Quando** ainda não escolhi a especialidade, **Então** as etapas seguintes aparecem desabilitadas.
- **CA2** — **Dado** que escolhi uma especialidade, **Quando** a lista de profissionais carrega, **Então** vejo nome e CRM dos médicos ativos dessa especialidade.
- **CA3** — **Dado** que escolhi o médico, **Quando** abro a etapa de data, **Então** vejo os próximos 14 dias e, ao escolher um, os horários livres.
- **CA4** — **Dado** que escolhi horário, **Quando** reviso e toco em "Confirmar", **Então** a consulta é criada e aparece nos meus agendamentos.
- **CA5** — **Dado** que o horário foi ocupado por outra pessoa, **Quando** confirmo, **Então** vejo "Este horário não está mais disponível." e posso escolher outro.

## US07 — Acompanhar meus agendamentos (RF07)
**Como** paciente, **quero** ver minhas consultas com status, data e período **para que** eu me organize.

- **CA1** — **Dado** que tenho consultas ativas futuras, **Quando** abro "Agendamentos", **Então** vejo cartões com status, especialidade, médico, data, horário e período (Manhã/Tarde/Noite).
- **CA2** — **Dado** que não tenho consultas, **Quando** abro a tela, **Então** vejo mensagem vazia com ação "Marcar consulta".
- **CA3** — **Dado** que as datas chegam em UTC, **Quando** são exibidas, **Então** aparecem no horário de Recife.

## US08 — Reagendar consulta (RF08)
**Como** paciente, **quero** mudar data e horário da consulta **para que** eu me adapte a imprevistos sem perder o médico.

- **CA1** — **Dado** que tenho consulta futura, **Quando** toco em "Reagendar", **Então** o fluxo pula especialidade e profissional e mantém o mesmo médico.
- **CA2** — **Dado** que escolhi novo horário livre, **Quando** confirmo, **Então** a consulta é atualizada e fica com status "Agendado".
- **CA3** — **Dado** que a consulta já foi cancelada ou já passou, **Quando** tento reagendar, **Então** vejo a mensagem da API e a lista é atualizada.

## US09 — Cancelar consulta (RF09)
**Como** paciente, **quero** cancelar uma consulta **para que** o horário seja liberado quando não puder comparecer.

- **CA1** — **Dado** que toco em "Cancelar", **Quando** a confirmação aparece, **Então** vejo "Deseja realmente cancelar esta consulta?" com "Voltar" e "Confirmar".
- **CA2** — **Dado** que confirmei, **Quando** a API responde com sucesso, **Então** a consulta some da lista e da Home.
- **CA3** — **Dado** que toquei em "Voltar", **Quando** a confirmação fecha, **Então** nenhuma requisição é feita.
- **CA4** — **Dado** que o cancelamento falhou, **Quando** a resposta chega, **Então** vejo "Não foi possível cancelar. Tente novamente." e os botões voltam a funcionar.

## US10 — Ver minhas próximas consultas (RF10)
**Como** médico, **quero** ver meus próximos pacientes agrupados por dia **para que** eu planeje meu atendimento.

- **CA1** — **Dado** que tenho consultas ativas, **Quando** abro a Home, **Então** vejo o "Próximo paciente" com nome, horário e motivo.
- **CA2** — **Dado** que há consultas em dias diferentes, **Quando** a lista carrega, **Então** ela é agrupada com títulos "Hoje", "Amanhã" ou data longa.
- **CA3** — **Dado** que o atendimento já começou, **Quando** a consulta é listada, **Então** vejo "Em espera" ou "Em atendimento" em vez de "Agendada/Confirmada".
- **CA4** — **Dado** que não há consultas, **Quando** abro a Home, **Então** vejo "Você não tem consultas agendadas no momento.".

## US11 — Gerenciar especialidades (RF11)
**Como** administrador, **quero** listar e criar especialidades **para que** pacientes encontrem médicos por área.

- **CA1** — **Dado** que abro "Especialidades", **Quando** a lista carrega, **Então** vejo todas em ordem alfabética, inclusive as sem médico.
- **CA2** — **Dado** que informei um nome com 3+ caracteres, **Quando** toco em "Adicionar", **Então** a especialidade entra na lista com selo "Nova" e o formulário é limpo.
- **CA3** — **Dado** que o nome já existe (ignorando maiúsculas), **Quando** adiciono, **Então** vejo "Esta especialidade já existe." no campo nome.
- **CA4** — **Dado** que o nome tem menos de 3 caracteres, **Quando** adiciono, **Então** vejo "Informe o nome da especialidade." sem requisição.

## US12 — Cadastrar médico com CRM (RF12)
**Como** administrador, **quero** cadastrar médicos com CRM e especialidades **para que** eles entrem no sistema e recebam agendamentos.

- **CA1** — **Dado** que preenchi todos os campos válidos e selecionei ≥ 1 especialidade, **Quando** toco em "Cadastrar", **Então** o médico é criado e vejo a confirmação com seu nome.
- **CA2** — **Dado** que digito o CRM, **Quando** insiro números e UF, **Então** a máscara forma `12345/PE`; formato diferente de 4–7 dígitos/UF exibe "Use o formato 12345/PE.".
- **CA3** — **Dado** que nenhuma especialidade foi selecionada, **Quando** envio, **Então** vejo "Selecione ao menos uma especialidade.".
- **CA4** — **Dado** que CPF, e-mail ou CRM já existem, **Quando** envio, **Então** vejo a mensagem de conflito da API.

## US13 — Usar o app com acessibilidade (RNF03, RNF04, RNF06)
**Como** paciente com baixa visão ou pouca familiaridade digital, **quero** botões grandes, contraste forte e rótulos para leitor de tela **para que** eu use o app com autonomia.

- **CA1** — **Dado** qualquer tela, **Quando** inspeciono elementos tocáveis, **Então** cada um tem área ≥ 44×44pt.
- **CA2** — **Dado** que o VoiceOver/TalkBack está ativo, **Quando** navego, **Então** botões, campos e erros têm rótulo e papel anunciados.
- **CA3** — **Dado** que aumentei a fonte do sistema, **Quando** abro as telas, **Então** o texto escala sem ser cortado.
