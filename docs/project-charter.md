# Project Charter — MedFácil Mobile

| Campo | Valor |
| :--- | :--- |
| **Projeto** | MedFácil Mobile |
| **Versão do documento** | 0.1.0 |
| **Base técnica** | `medfacil-pwa-main` (frontend atual), `medfacil-backend-main` (API REST) e [plano-migracao-react-native.md](../../docs/plano-migracao-react-native.md) |
| **Stack-alvo** | Expo, React Native, TypeScript, NativeWind, Expo Router |

## 1. Visão Geral

O **MedFácil Mobile** é a versão nativa (Android e iOS) do MedFácil, sistema de agendamento de consultas médicas hoje entregue como PWA (React + Vite + Tailwind). O app consome a **mesma API REST** (`/api/v1`) do `medfacil-backend`, sem alterar contratos ou regras de negócio, e atende três perfis (`PACIENTE`, `MEDICO`, `ADMIN`).

## 2. Justificativa

1. **Acessibilidade.** O público inclui pessoas idosas e com pouca familiaridade digital (ver persona e documentos em `Doumentos_MedFacil`). O app nativo permite áreas de toque ≥ 44pt, alto contraste, suporte a leitores de tela (VoiceOver/TalkBack) e escala de fonte do sistema.
2. **Agendamento médico confiável.** O fluxo (especialidade → profissional → data → horário → revisão) é o núcleo do produto e deve funcionar bem em celulares, com teclado numérico para CPF/telefone e feedback claro de erros (ex.: horário já ocupado, `409`).
3. **Segurança do token.** No PWA o JWT fica em `localStorage` (via `persist` do Zustand), exposto a XSS. No mobile será guardado em `expo-secure-store` (Keychain/Keystore).
4. **Limitações do PWA.** O Service Worker (`public/sw.js`) e `manifest.json` não existem em ambiente nativo; a experiência de instalação e cache passa a ser nativa.
5. **Reuso.** Serviços, schemas Zod, máscaras/validação de CPF, utilitários de data (fuso `America/Recife`) e `appointment.store` são reaproveitáveis (seção 3 do plano de migração).

## 3. Objetivos SMART

| # | Objetivo | Específico | Mensurável | Atingível | Relevante | Prazo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| O1 | Paridade funcional com o PWA | Entregar login, cadastro, agendamento, reagendamento, cancelamento (paciente), próximas consultas (médico) e gestão de médicos/especialidades (admin) | 100% dos RF01–RF12 aprovados nos critérios de aceite BDD | Camada de serviços reaproveitável | Substitui o PWA em dispositivos móveis | MVP `v0.1.0` em 10 semanas |
| O2 | Acessibilidade | Todos os controles interativos com área ≥ 44×44pt, contraste mínimo WCAG AA (4,5:1) e rótulos de acessibilidade | 0 violações críticas em auditoria manual com VoiceOver e TalkBack nas telas do MVP | Componentes de UI centralizados | Público com baixa familiaridade digital | Fase 4 do roadmap |
| O3 | Segurança de sessão | Token JWT e usuário persistidos somente em `expo-secure-store`; logout limpa dados | 0 ocorrências de token em `AsyncStorage`/logs; 401 sempre leva ao login | Padrão da plataforma | Dados de saúde são sensíveis | Fase 2–3 |
| O4 | Desempenho | Abertura a frio e navegação fluida | Tela inicial interativa em ≤ 3 s (dispositivo intermediário, rede 4G); listas sem queda perceptível de FPS | Hermes + `FlatList` | Retenção de usuários | Fase 5 |
| O5 | Qualidade e entrega | Builds de teste Android (APK) e iOS (TestFlight) via EAS | Builds `preview` instalados e validados em ≥ 1 dispositivo Android e ≥ 1 iOS; cobertura ≥ 70% em `utils/` e `schemas/` | EAS Build | Validação com stakeholders | Fim da Fase 5 |

## 4. Escopo

### 4.1 Dentro do escopo inicial (MVP `v0.1.0`)

- Autenticação por CPF e senha, com roteamento por role (`PACIENTE`, `MEDICO`, `ADMIN`) e logout.
- Cadastro de paciente (nome, e-mail, CPF válido, telefone, data de nascimento `DD/MM/AAAA`, senha 8–72 caracteres).
- **Paciente:** Home (próxima consulta), listagem de agendamentos, agendamento em 4 etapas + revisão, reagendamento (mesmo médico), cancelamento com confirmação.
- **Médico:** Home com próximas consultas agrupadas por dia (`GET /doctor/appointments`).
- **Administrador:** cadastro de médico (CRM `12345/PE`, ≥ 1 especialidade) e de especialidades.
- Persistência segura da sessão, cache de consultas, estados de carregamento/erro/vazio e acessibilidade.

### 4.2 Fora do escopo inicial

Itens que aparecem como placeholders no PWA (rotas `/mais`, cards "Minhas receitas", "Minha saúde", "Prontuários", "Prescrever", "Solicitar exames") ou no modelo de dados, mas **sem API/telas implementadas**:

- Prontuário, receitas, solicitação/agendamento de exames, notificações push, atendimento (mudança de `StatusAtendimento` pelo médico).
- Agenda geral do admin, bloqueio de horários, aprovação de remarcações e indicadores administrativos (hoje dados fictícios no PWA).
- Fluxo "Esqueci minha senha" (somente visual no PWA).
- Cadastro/edição de grade de horários do médico (`Agenda`) e telefone múltiplo.
- Alterações no backend, tablets/layout desktop (Sidebar), publicação nas lojas, modo offline com escrita.

> Itens fora do escopo só entram mediante novo contrato de API e revisão deste charter.

## 5. Stakeholders

| Stakeholder | Papel | Interesse / Expectativa |
| :--- | :--- | :--- |
| **Pacientes** (`PACIENTE`) | Usuários finais | Marcar, reagendar e cancelar consultas com poucos toques e linguagem clara |
| **Médicos** (`MEDICO`) | Usuários finais | Ver rapidamente próximos pacientes por dia |
| **Administradores** (`ADMIN`) | Usuários finais / gestão | Cadastrar médicos (CRM) e especialidades com segurança |
| **Equipe de desenvolvimento** | Execução | Reaproveitar o core, manter qualidade, Git Flow + Conventional Commits |
| **Professores/Orientação acadêmica** | Avaliação | Aderência a requisitos e documentação (feedback registrado em `Doumentos_MedFacil`) |

## 6. Premissas, Restrições e Riscos

| Tipo | Descrição |
| :--- | :--- |
| Premissa | API `medfacil-backend` disponível e acessível pelo dispositivo (`EXPO_PUBLIC_API_URL`). |
| Restrição | Contratos da API e regras de negócio permanecem inalterados. |
| Restrição | Fuso da clínica: `America/Recife`; horários trafegam como `AAAA-MM-DD` e `HH:mm`. |
| Risco | `Intl.DateTimeFormat` com `timeZone` no Hermes pode divergir entre plataformas → validar em dispositivos reais. |
| Risco | JWT expira (`JWT_EXPIRES_IN`, padrão `7d`) e não há refresh token → 401 força novo login. |
| Risco | `localhost` não funciona em emulador/dispositivo → usar IP da rede (`10.0.2.2` no emulador Android). |
