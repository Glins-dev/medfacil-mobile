# Requisitos — MedFácil Mobile

Fonte: código real de `medfacil-pwa-main` e `medfacil-backend-main` (rotas, validators Zod e services). Prefixo da API: `/api/v1`.

## 1. Requisitos Funcionais

| ID | Requisito | Perfil | Contrato / Regra de negócio |
| :--- | :--- | :--- | :--- |
| **[RF01]** | **Login por CPF e senha.** O sistema deve autenticar com CPF (com ou sem máscara; enviado só com dígitos) e senha, receber `{ token, user }` e armazenar a sessão. | Todos | `POST /auth/login`; CPF validado pelo algoritmo oficial; login limitado por `loginLimiter` no backend |
| **[RF02]** | **Redirecionamento e proteção por role.** Após autenticação, direcionar para a Home do perfil (`PACIENTE`, `MEDICO`, `ADMIN`) e bloquear telas de outros perfis. | Todos | JWT com `sub` e `role`; backend responde `403` fora do papel; `homePathByRole` |
| **[RF03]** | **Logout.** Encerrar sessão limpando token, usuário e cache de consultas e retornando ao login, mesmo se a chamada ao servidor falhar. | Todos | `POST /auth/logout` (stateless); limpeza local sempre ocorre |
| **[RF04]** | **Cadastro de paciente com validação de CPF.** Coletar nome (≥ 3), e-mail válido, CPF válido, telefone (DDD, 10–11 dígitos), data de nascimento `DD/MM/AAAA` (real, ≥ 1900, não futura) e senha (8–72 caracteres) com máscaras; entrar logado após o cadastro. | Visitante | `POST /auth/register` → `201 { token, user }`; role sempre `PACIENTE`; `409` para CPF/e-mail duplicado |
| **[RF05]** | **Home do paciente.** Exibir saudação, atalho "Agendar consulta" e a próxima consulta (data, horário, especialidade, médico), com estados carregando/erro/vazio e "tentar novamente". | PACIENTE | `GET /appointments` (futuras e ativas, ordem crescente); cache de 5 min |
| **[RF06]** | **Agendar consulta em 4 etapas + revisão.** (1) Especialidade, (2) Profissional, (3) Data (próximos 14 dias), (4) Horário livre; depois revisão e confirmação. Cada etapa só é liberada após a anterior. | PACIENTE | `GET /catalog/specialties` (só com médico ativo); `GET /catalog/specialties/:id/doctors`; `GET /catalog/doctors/:id/slots?date=AAAA-MM-DD`; `POST /appointments { doctorId, date, time }` → `201`; `409` se horário indisponível ou paciente já tem consulta no horário |
| **[RF07]** | **Listar agendamentos.** Mostrar consultas com status (`AGENDADO`/`CONFIRMADO`), especialidade, médico, data longa, horário e período (Manhã/Tarde/Noite). | PACIENTE | `GET /appointments`; datas em ISO UTC formatadas em `America/Recife` |
| **[RF08]** | **Reagendar consulta.** Alterar data e horário mantendo o mesmo médico (etapas de data, horário e revisão); após reagendar o status volta a `AGENDADO`. | PACIENTE | `PATCH /appointments/:id/reschedule { date, time }`; só consultas futuras e não canceladas (`409`); `404` se não pertence ao paciente |
| **[RF09]** | **Cancelar consulta com confirmação.** Pedir confirmação ("Deseja realmente cancelar?") e remover a consulta da lista e da Home sem nova requisição. | PACIENTE | `PATCH /appointments/:id/cancel`; `409` se já cancelada ou já iniciada; status `CANCELADO` |
| **[RF10]** | **Agenda do médico por período.** Listar próximas consultas ativas do médico agrupadas por dia ("Hoje", "Amanhã", data), com horário, paciente, motivo e status (agendada/confirmada ou atendimento) e destaque do próximo paciente. | MEDICO | `GET /doctor/appointments?limit=N` (padrão 5), ordenado por data; inclui consultas em espera/atendimento nas últimas 12 h. *Filtro por intervalo de datas depende de evolução da API (ver backlog)* |
| **[RF11]** | **Gestão de especialidades.** Listar todas (inclusive sem médico) e criar nova (nome 3–80, descrição opcional ≤ 200); nome único sem diferenciar maiúsculas. | ADMIN | `GET/POST /admin/specialties`; `409` "Esta especialidade já existe." |
| **[RF12]** | **Cadastro de médico com CRM.** Informar nome, e-mail, CPF, telefone, CRM no formato `12345/PE` (4–7 dígitos + UF), senha inicial (8–72) e ≥ 1 especialidade (máx. 10). | ADMIN | `POST /admin/doctors` → `201 { doctor }`; `409` para CPF/e-mail/CRM duplicado; `400` se especialidade inexistente |

## 2. Requisitos Não Funcionais

| ID | Categoria | Requisito | Verificação |
| :--- | :--- | :--- | :--- |
| **[RNF01]** | Segurança | O token JWT e o usuário devem ser persistidos exclusivamente em `expo-secure-store`; nunca em `AsyncStorage`, logs ou código. Toda requisição autenticada usa `Authorization: Bearer <token>`. | Revisão de código; inspeção do armazenamento do app |
| **[RNF02]** | Segurança | Comunicação somente via HTTPS em produção; resposta `401` deve limpar a sessão e redirecionar ao login sem recarregar documento (`window.location` não existe). Senhas jamais armazenadas/registradas no cliente; hashing permanece no backend (`bcryptjs`). | Teste de integração com token inválido; revisão de logs |
| **[RNF03]** | Acessibilidade | Todo elemento tocável deve ter área ≥ 44×44pt (usar `hitSlop` quando necessário) e `accessibilityRole`, `accessibilityLabel` e `accessibilityState`. | Auditoria com VoiceOver e TalkBack; checklist por tela |
| **[RNF04]** | Acessibilidade | Contraste mínimo WCAG AA (4,5:1 texto normal; 3:1 texto grande) usando a paleta da marca (`#0e706f`, `#004959`, `#29a4b4`, `#fec93f`, `#fef7e5`); informação nunca apenas por cor; respeitar escala de fonte do sistema. | Ferramenta de contraste; teste com fonte aumentada |
| **[RNF05]** | Desempenho | Abertura a frio ≤ 3 s em dispositivo intermediário; listas com `FlatList`; evitar requisições duplicadas e reaproveitar cache (`STALE_AFTER_MS` = 5 min). | Medição em dispositivo real; Profiler |
| **[RNF06]** | Usabilidade | Interface em pt-BR; teclados adequados (`number-pad`, `email-address`, `phone-pad`), máscaras de CPF/telefone/data/CRM, mensagens de erro claras junto ao campo, estados de carregamento/erro/vazio com ação "Tentar novamente"; formulários com `KeyboardAvoidingView`. | Teste de usabilidade com roteiro |
| **[RNF07]** | Portabilidade | Executar em Android e iOS a partir de um único código-base TypeScript (Expo, Expo Router, NativeWind), respeitando `SafeAreaView`/notch; builds via EAS. | Execução no Expo Go e builds `preview` |
| **[RNF08]** | Confiabilidade / Consistência de dados | Datas e horários seguem o fuso `America/Recife`; contratos da API e enums (`Role`, `StatusAgendamento`, `StatusAtendimento`) espelham o backend; falha em segundo plano não apaga dados já exibidos. | Testes unitários de `utils/date`; testes de contrato dos services |

## 3. Matriz de Rastreabilidade (RF → Telas)

| RF | Tela(s) mobile | Origem no PWA |
| :--- | :--- | :--- |
| RF01, RF02, RF03 | Login, layout raiz (AuthGate) | `screens/Login`, `ProtectedRoute`, `useLogout` |
| RF04 | Cadastro | `screens/FormRegister` |
| RF05 | Home do Paciente | `screens/Patient/Home` |
| RF06, RF08 | Agendar / Reagendar | `screens/Patient/ScheduleAppointment` |
| RF07, RF09 | Agendamentos | `screens/Patient/Agenda` |
| RF10 | Home do Médico | `screens/Medics/Home` |
| RF11 | Modal de Especialidades | `components/modals/NewSpecialtyModal` |
| RF12 | Novo Médico | `screens/Admin/NewDoctor` |
