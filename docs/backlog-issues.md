# Backlog de Issues — MedFácil Mobile

15 issues prontas para o GitHub Issues. Labels sugeridas: `type:feature`, `type:chore`, `type:docs`, `type:test`, `area:auth`, `area:patient`, `area:doctor`, `area:admin`, `area:ui`, `area:infra`, `a11y`, `security`, `priority:high|medium|low`.
Convenção de branch: `feature/issue-XX-descricao` (a partir de `develop`, Git Flow). Commits: Conventional Commits (`feat(auth): ... (#XX)`).

---

## Issue #01 — Inicializar projeto Expo + TypeScript + Expo Router
- **Labels:** `type:chore`, `area:infra`, `priority:high`
- **Branch:** `feature/issue-01-setup-expo-typescript`
- **Descrição:** Criar `medfacil-mobile` com Expo, TypeScript `strict`, Expo Router, alias `@/*`, ESLint/Prettier e variável `EXPO_PUBLIC_API_URL`.
- **Critérios de Aceite:**
  - [ ] `npx expo start` abre no Expo Go (Android e iOS) com tela placeholder.
  - [ ] `tsc --noEmit` e lint passam.
  - [ ] `.env.example` documenta `EXPO_PUBLIC_API_URL` (nota sobre `10.0.2.2`/IP local).

## Issue #02 — Configurar NativeWind e tokens da marca
- **Labels:** `type:chore`, `area:ui`, `priority:high`
- **Branch:** `feature/issue-02-nativewind-tema`
- **Descrição:** Configurar NativeWind v4 com paleta MedFácil (`#0e706f`, `#004959`, `#29a4b4`, `#fec93f`, `#fef7e5`, ink `#1f2d33`, muted `#5f6b6f`, line `#d9d4c7`, danger `#d64545`, success `#2e9e6b`), `SafeAreaProvider`, `expo-linear-gradient` e `react-native-svg`.
- **Critérios de Aceite:**
  - [ ] Classes `bg-brand`, `text-brand-dark` etc. funcionam em Android e iOS.
  - [ ] Componente de gradiente da marca disponível.
  - [ ] Contraste dos pares texto/fundo documentado (WCAG AA).

## Issue #03 — Portar utilitários, schemas e testes unitários
- **Labels:** `type:feature`, `type:test`, `area:infra`, `priority:high`
- **Branch:** `feature/issue-03-portar-utils-schemas`
- **Descrição:** Copiar `cpf.ts`, `masks.ts`, `date.ts`, `auth.schema.ts`; extrair para schemas Zod as validações de cadastro (`maskDate`, `isValidDate`) e de médico (CRM `^\d{4,7}\/[A-Z]{2}$`).
- **Critérios de Aceite:**
  - [ ] Testes cobrem CPF válido/inválido/repetido, máscaras, CRM, data de nascimento e `America/Recife` (cobertura ≥ 70%).
  - [ ] Funções de data validadas em Hermes (Android e iOS).

## Issue #04 — Camada de API e serviços (axios)
- **Labels:** `type:feature`, `area:infra`, `security`, `priority:high`
- **Branch:** `feature/issue-04-api-services`
- **Descrição:** Portar `api.ts` e `services/*` (auth, appointment, catalog, admin, doctor). Remover `import.meta.env` e `window.location`; interceptor injeta `Bearer` e, em `401`, chama `logout()`.
- **Critérios de Aceite:**
  - [ ] Contratos idênticos aos endpoints `/auth`, `/appointments`, `/catalog`, `/admin`, `/doctor`.
  - [ ] `401` limpa sessão sem recarregar documento.
  - [ ] Testes de serviços com mock do axios.

## Issue #05 — Store de autenticação com expo-secure-store
- **Labels:** `type:feature`, `area:auth`, `security`, `priority:high`
- **Branch:** `feature/issue-05-auth-store-secure-store`
- **Descrição:** Migrar `auth.store` com `persist` + `createJSONStorage` sobre `expo-secure-store` e flag `hasHydrated`.
- **Critérios de Aceite:**
  - [ ] Token/usuário só em SecureStore (nada em AsyncStorage).
  - [ ] Sessão sobrevive a reinício do app.
  - [ ] Nenhum flash do Login durante a hidratação.

## Issue #06 — Navegação por role e AuthGate (RF02)
- **Labels:** `type:feature`, `area:auth`, `priority:high`
- **Branch:** `feature/issue-06-navegacao-authgate`
- **Descrição:** Grupos `(auth)`, `(patient)`, `(doctor)`, `(admin)` no Expo Router; Bottom Tabs (Início, Consultas/Agenda, etc., espelhando `*NavItems`); redirecionamento por `homePathByRole`.
- **Critérios de Aceite:**
  - [ ] Sem token → Login; com token → Home da role.
  - [ ] Role errada redireciona à própria Home.
  - [ ] Tabs respeitam área segura inferior.

## Issue #07 — Componentes de UI base acessíveis
- **Labels:** `type:feature`, `area:ui`, `a11y`, `priority:high`
- **Branch:** `feature/issue-07-componentes-ui-base`
- **Descrição:** `Button` (primary/secondary/ghost, loading), `Input` (erro, dica, mostrar/ocultar senha, `KeyboardType`), `TextLink`, `Modal` (bottom sheet), `MainCard`, `NoticeCard`, `DateBadge`, `QuickAccessCard`, ícones SVG.
- **Critérios de Aceite:**
  - [ ] Alvos ≥ 44×44pt, `accessibilityRole/Label/State` definidos.
  - [ ] Estados de loading/erro/vazio reutilizáveis.
  - [ ] Verificado com TalkBack e VoiceOver.

## Issue #08 — Tela de Login (RF01, RF03)
- **Labels:** `type:feature`, `area:auth`, `priority:high`
- **Branch:** `feature/issue-08-tela-login`
- **Descrição:** Login com `react-hook-form` + `loginSchema`, máscara de CPF, erro raiz da API, logout unificado (`useLogout` limpa auth e appointment stores).
- **Critérios de Aceite:**
  - [ ] US01 e US03 atendidas.
  - [ ] Teclado não cobre o botão (`KeyboardAvoidingView`).
  - [ ] "Esqueci minha senha" não implementado (fora de escopo; ocultar ou desabilitar).

## Issue #09 — Tela de Cadastro de paciente (RF04)
- **Labels:** `type:feature`, `area:auth`, `priority:high`
- **Branch:** `feature/issue-09-cadastro-paciente`
- **Descrição:** Formulário com nome, e-mail, CPF, telefone, data `DD/MM/AAAA`, senha (8–72) e máscaras; usa schema Zod compartilhado; autentica após `201`.
- **Critérios de Aceite:**
  - [ ] US04 atendida, incluindo `409`.
  - [ ] Teclados corretos por campo; rolagem com teclado aberto.

## Issue #10 — Home do paciente e store de consultas (RF05, RF07)
- **Labels:** `type:feature`, `area:patient`, `priority:high`
- **Branch:** `feature/issue-10-home-paciente-agenda`
- **Descrição:** Portar `appointment.store`; Home (próxima consulta, acesso rápido) e tela "Agendamentos" com `FlatList`, status e período.
- **Critérios de Aceite:**
  - [ ] US05 e US07 atendidas.
  - [ ] Cache de 5 min; sem dados de outro usuário após troca de conta.
  - [ ] Pull-to-refresh.

## Issue #11 — Fluxo de agendamento em 4 etapas (RF06)
- **Labels:** `type:feature`, `area:patient`, `priority:high`
- **Branch:** `feature/issue-11-fluxo-agendamento`
- **Descrição:** Etapas Especialidade → Profissional → Data (14 dias) → Horário → Revisão, com bloqueio sequencial, reinício de etapas posteriores e tratamento de `409`/`404`.
- **Critérios de Aceite:**
  - [ ] US06 atendida (CA1–CA5).
  - [ ] Cache atualizado via `upsert` após `POST /appointments`.
  - [ ] Datas e horários no fuso `America/Recife`.

## Issue #12 — Reagendar e cancelar consultas (RF08, RF09)
- **Labels:** `type:feature`, `area:patient`, `priority:high`
- **Branch:** `feature/issue-12-reagendar-cancelar`
- **Descrição:** Modo reagendamento (`?reschedule=id`, mesmo médico) e cancelamento com confirmação inline (corrige o `TODO`/`console.log` do PWA).
- **Critérios de Aceite:**
  - [ ] US08 e US09 atendidas.
  - [ ] Reagendamento volta o status para `AGENDADO`.
  - [ ] Erros `404`/`409` exibem a mensagem da API.

## Issue #13 — Home do médico: próximas consultas (RF10)
- **Labels:** `type:feature`, `area:doctor`, `priority:medium`
- **Branch:** `feature/issue-13-home-medico`
- **Descrição:** Consumir `GET /doctor/appointments`, agrupar por dia (`getClinicDateKey`, `describeDayHeading`), destacar próximo paciente e mapear status de atendimento. Registrar proposta de filtro por período para o backend.
- **Critérios de Aceite:**
  - [ ] US10 atendida.
  - [ ] Pull-to-refresh e estados de erro/vazio.
  - [ ] Issue de acompanhamento aberta no backend para filtro `from/to` (se aprovada).

## Issue #14 — Admin: especialidades e cadastro de médico (RF11, RF12)
- **Labels:** `type:feature`, `area:admin`, `priority:medium`
- **Branch:** `feature/issue-14-admin-medicos-especialidades`
- **Descrição:** Modal de especialidades (lista + criação) e tela "Novo médico" com CRM mascarado, seleção múltipla de especialidades e tratamento de `409`/`400`. Home do admin sem indicadores fictícios ou claramente sinalizados como "em breve".
- **Critérios de Aceite:**
  - [ ] US11 e US12 atendidas.
  - [ ] Senha inicial e CPF não são registrados em logs.
  - [ ] Formulário limpo após sucesso.

## Issue #15 — Qualidade: acessibilidade, testes e build EAS
- **Labels:** `type:test`, `a11y`, `area:infra`, `priority:medium`
- **Branch:** `feature/issue-15-qualidade-eas`
- **Descrição:** Auditoria de acessibilidade (US13), testes de fluxos críticos (login, agendar, cancelar), configuração de `eas.json` (development/preview/production), ícones e splash.
- **Critérios de Aceite:**
  - [ ] Checklist RNF03/RNF04 aprovado nas telas do MVP.
  - [ ] Build `preview` Android (APK) e iOS (TestFlight) instalado e testado.
  - [ ] Tag `v0.1.0` criada na `main` após merge da release.
