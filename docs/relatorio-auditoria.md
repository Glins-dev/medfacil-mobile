# Relatório Técnico de Auditoria: MedFácil Mobile

Auditoria técnica realizada em `medfacil-mobile` em comparação com o projeto web original (`medfacil-pwa-main`) e a API backend (`medfacil-backend-main`), avaliando os critérios da entrega final da disciplina ministrada pelo **Prof. Icaro Ferreira** (Faculdade Senac).

- **Projeto:** MedFácil Mobile
- **Integrantes do Grupo:** Guilherme Lins Monteiro De Melo, Jamesson Ferreira e Arthur Miguel
- **Data da Auditoria:** 23/11/2026

---

## 1. Resumo Executivo por Etapa

| Critério | Status | Parecer Objetivo |
| :--- | :--- | :--- |
| **Etapa 1: Adaptação do PWA para React Native** | **Atendido** | Identidade visual e fluxos do PWA recriados integralmente com componentes nativos e arquitetura modular; zero ocorrências de `react-native-webview`. |
| **Etapa 2: Recursos Obrigatórios** | **Atendido** | Cumpre com folga o mínimo exigido (1 navegação + 3 recursos): possui `Stack Navigator` e `Bottom Tabs`, animação `Slide` e recursos nativos completos (`Modal`, `FlatList`, `ScrollView`, `Pressable`, `TextInput`, `useState` e `Icons` SVG). |
| **Etapa 3: Funcionalidades do Aplicativo** | **Atendido** | Fluxos completos implementados para **Paciente**, **Médico** e **Administrador**. Módulos sem endpoint REST correspondente no backend utilizam serviços assíncronos persistidos com `expo-secure-store`. |
| **Etapa 4: Implementação, Organização e Qualidade** | **Atendido** | React Native `0.88.1` com Expo `~58.0`, TypeScript (`strict`), `SafeAreaProvider`, `useSafeAreaInsets`, `KeyboardAvoidingView`, Zod v4, `npx tsc --noEmit` (`exit code 0`) e Vitest (`11` arquivos / `65` testes passando). |
| **Etapa 5: Documentação (`README.md`)** | **Atendido** | `medfacil-mobile/README.md` atualizado com nome do projeto, integrantes completos do grupo, recursos implementados (Etapa 2 + Desafio Extra) e passo a passo com Expo. |

---

## 2. Evidências Detalhadas por Etapa

### Etapa 1: Adaptação do Projeto PWA para React Native

- **Ausência de `WebView`:** busca completa em `package.json` e `src/` confirmou `0` ocorrências de `react-native-webview` ou `WebView`. Toda a interface é renderizada nativamente com `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `FlatList`, `Modal`, `Image`, `ActivityIndicator`, `RefreshControl` e `Switch`, estilizados com NativeWind v4.
- **Organização Modular:**
  - `21` telas dedicadas em `src/screens/` cobrindo Autenticação, Paciente, Médico e Administrador, expandindo as telas originais de `medfacil-pwa-main/src/screens/` (`Login`, `FormRegister`, `Patient/Home`, `Patient/Consultations`, `Patient/Agenda`, `Patient/ScheduleAppointment`, `Medics/Home`, `Admin/Home` e `Admin/NewDoctor`).
  - `24` componentes reutilizáveis em `src/components/` organizados em `ui/`, `cards/`, `modals/`, `doctor/` e `schedule/`.

### Etapa 2: Recursos Obrigatórios Estudados em Sala

| Categoria | Recurso | Status | Evidências no Código |
| :--- | :--- | :--- | :--- |
| Navegação | `Stack Navigator` (`createNativeStackNavigator`) | **Atendido** | `src/navigation/AuthStack.tsx` (`Login`, `Register`) e `src/navigation/PatientStack.tsx` (`PatientTabs` e 7 telas de pilha) |
| Navegação | `Bottom Tabs` (`createBottomTabNavigator`) + barra flutuante | **Atendido** | `src/navigation/PatientTabs.tsx`, `src/navigation/DoctorTabs.tsx`, `src/navigation/AdminTabs.tsx` e `src/components/ui/FloatingTabBar.tsx` |
| Navegação | `Drawer Navigator` | **Não utilizado** | Optou-se por `Stack Navigator` + `Bottom Tabs`, atendendo ao requisito mínimo de pelo menos uma navegação |
| Animações | `Slide` e transições nativas | **Atendido (`Slide`)** | `src/components/ui/Modal.tsx` (`animationType="slide"`), transições nativas do React Navigation e rolagem animada (`scrollTo({ animated: true })`) em 5 telas de formulário (`Fade`, `Zoom`, `Bounce`, `Shake` e `Pulse` customizados não foram utilizados) |
| Componentes e Estado | `Modal` | **Atendido** | `20` ocorrências em `16` arquivos (`src/components/ui/Modal.tsx`, modais clínicos, dropdowns e confirmações) |
| Componentes e Estado | `FlatList` | **Atendido** | `src/screens/PatientConsultationsScreen.tsx` e `src/screens/PatientPrescriptionsScreen.tsx` |
| Componentes e Estado | `ScrollView` | **Atendido** | `108` ocorrências em `25` arquivos |
| Componentes e Estado | `Pressable` (substituto moderno de `TouchableOpacity`) | **Atendido** | `180` ocorrências em `30` arquivos com feedback visual e área tocável acessivel (`TouchableOpacity` possui `0` ocorrências por padronização em `Pressable`) |
| Componentes e Estado | `TextInput` | **Atendido** | `src/components/ui/Input.tsx` (utilizado em Login, Cadastro, Minha saúde, Gestão Admin e Envio de Receitas) |
| Componentes e Estado | `useState` e gerenciamento global | **Atendido** | `131` ocorrências em `22` arquivos, somadas às stores Zustand em `src/stores/` |
| Ícones | `Icons` vetoriais SVG e ilustrações locais | **Atendido** | Ícones SVG (`react-native-svg`, `21` arquivos) centralizados em `src/navigation/icons.tsx` e ilustrações médicas em `assets/icons/` |

### Etapa 3: Funcionalidades do Aplicativo

- **Autenticação e Tela Inicial:** `LoginScreen.tsx` e `RegisterScreen.tsx` mantêm a identidade visual institucional (`#c6eceb`, `#0e706f`, `#F7C343`) com `BrandLogo` e redirecionamento seguro por role em `src/navigation/RootNavigator.tsx`.
- **Perfil Paciente (`Atendido`):**
  - Tela inicial (`PatientHomeScreen.tsx`), listagem e filtros de consultas (`PatientConsultationsScreen.tsx`), agendamento em 3 etapas com revisão (`PatientScheduleScreen.tsx`) e confirmação (`PatientBookingConfirmedScreen.tsx`).
  - Detalhes da consulta (`PatientAppointmentDetailsScreen.tsx`) com botão **"Veja a melhor rota"** abrindo o trajeto no Google Maps (`src/utils/maps.ts`), além de confirmação de presença (`PatientConfirmAttendanceScreen.tsx`), reagendamento (`RescheduleAppointmentModal.tsx`) e cancelamento (`CancelAppointmentModal.tsx`).
  - Receitas médicas (`PatientPrescriptionsScreen.tsx`), pré-prontuário (`PatientHealthScreen.tsx`) e Perfil (`PatientProfileScreen.tsx`) com exibição de Dados pessoais incluindo Sexo e Endereço.
- **Perfil Médico (`Atendido`):**
  - Tela inicial (`DoctorHomeScreen.tsx`) com fila de atendimentos, atalho para envio de receitas (`SendPrescriptionModal.tsx`) e visualização do pré-prontuário do paciente (`PatientPreChartModal.tsx`).
  - Aba **Hospitais** (`DoctorHospitalsScreen.tsx`) exibindo unidades vinculadas com nomes de especialidades resolvidos.
  - Aba **Agenda** (`DoctorScheduleScreen.tsx`) inspirada no Google Agenda com visões **Dia**, **Semana** e **Mês** no fuso `America/Recife`, codificação por status, linha de horário atual, colunas sem sobreposição para horários coincidentes e modal rápido com atalhos clínicos.
- **Perfil Administrador (`Atendido`):**
  - Painel inicial (`AdminHomeScreen.tsx`) com cadastro de especialidades e exclusão de médicos em cascata.
  - Cadastro de médicos (`AdminNewDoctorScreen.tsx`), gestão de hospitais e vínculo de médicos compatíveis (`AdminHospitalsScreen.tsx`) e gestão de horários (`AdminSchedulesScreen.tsx`).
- **Integração Backend vs Persistência Local Segura:**
  - Os fluxos de autenticação, catálogo público, agendamentos do paciente, fila médica e gestão de especialidades/médicos do admin consomem diretamente a API REST `medfacil-backend-main`.
  - Funcionalidades sem endpoint correspondente no backend (receitas médicas, hospitais/horários avulsos do admin, pré-prontuário "Minha saúde" e endereço estendido de usuário) operam por meio de camadas de serviço assíncronas (`src/services/`) conectadas a stores Zustand persistidas localmente via `expo-secure-store`.

### Etapa 4: Implementação, Organização e Qualidade

- **React Native com Expo:** configurado em `package.json` (`expo ^58.0.26`, `react-native ^0.88.1`, `nativewind ^4.2.7`, `vitest ^5.1.1`) e `app.json` (`name: "MedFácil"`, `softwareKeyboardLayoutMode: "resize"`, plugin `expo-secure-store`).
- **Adaptação a Diferentes Telas e Teclado:** `SafeAreaProvider` em `App.tsx`, uso exclusivo de `SafeAreaView` e `useSafeAreaInsets` de `react-native-safe-area-context`, `KeyboardAvoidingView` em `7` arquivos (`Modal.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`, `PatientHealthScreen.tsx`, `AdminNewDoctorScreen.tsx`, `AdminHospitalsScreen.tsx`, `AdminSchedulesScreen.tsx`) e cálculo dinâmico de rolagem por coordenada (`scrollToField`).
- **Validação e Tratamento de Erros:** schemas Zod v4 em `src/schemas/` (`auth.schema.ts`, `admin.schema.ts`, `healthProfile.schema.ts`, `prescription.schema.ts`) e tratamento de erros de rede/HTTP em `src/services/api.ts` e `src/services/appointment.service.ts`.
- **Resultados das Verificações:**
  - `npx tsc --noEmit`: concluído sem erros (`exit code 0`).
  - `npm test`: **11 arquivos de teste / 65 testes passando** (`admin.management.test.ts`, `auth.schema.test.ts`, `booking.flow.test.ts`, `calendar.test.ts`, `cpf.test.ts`, `date.test.ts`, `healthProfile.test.ts`, `maps.test.ts`, `masks.test.ts`, `prescription.test.ts`, `specialties.test.ts`).

### Etapa 5: Documentação de Entrega (`README.md`)

- `medfacil-mobile/README.md` validado e atualizado com:
  1. Nome do projeto (`MedFácil`).
  2. Nomes completos dos integrantes (`Guilherme Lins Monteiro De Melo`, `Jamesson Ferreira` e `Arthur Miguel`).
  3. Tabela completa dos recursos implementados (Etapa 2 e Desafio Extra).
  4. Instruções passo a passo de instalação, configuração do `.env` e execução com `npx expo start`.

---

## 3. Resumo para Apresentação Oral (Etapa 5)

1. **Adaptação do PWA para Mobile Nativo:** reconstrução completa de `medfacil-pwa-main` para React Native com Expo e NativeWind v4, sem `WebView`, mantendo a identidade visual, o fuso clínico `America/Recife` e a integração com `medfacil-backend`.
2. **Recursos da Etapa 2 Aplicados no Código:**
   - **Navegação:** `RootNavigator` separa sessões entre `AuthStack` (`Stack`), `PatientStack` (`Stack` + `PatientTabs`), `DoctorTabs` e `AdminTabs` (`Bottom Tabs` com `FloatingTabBar`).
   - **Componentes e Estado:** `Modal` com animação `slide`, `FlatList` em Consultas e Minhas receitas, `ScrollView` com rolagem ajustada ao teclado nos formulários, `Pressable` com alvos `>= 48px`, `TextInput` customizado (`Input.tsx`), `useState` + Zustand e ícones SVG em `src/navigation/icons.tsx`.
3. **Principais Dificuldades Técnicas Resolvidas:**
   - Correção da confirmação de horários cadastrados pelo Admin no app quando a tabela `Agenda` do backend retornava HTTP `409`, evitando perda de estado na tela de revisão.
   - Controle de rolagem de formulário com teclado no Android/iOS e remoção de artefato cinza causado por `elevation` em `TextInput` com halo de foco transparente.
   - Resolução unificada de especialidades entre catálogo público e vínculos de hospitais para não exibir UUIDs brutos.
4. **Diferenciais Extras Entregues:**
   - **Acessibilidade WCAG:** alvos mínimos de `48px`, `hitSlop` compensatório e rótulos semânticos para leitores de tela.
   - **Rotas no Google Maps:** integração entre endereço cadastrado do paciente e endereço real do hospital nos detalhes da consulta.
   - **Pré-prontuário (`Minha saúde`) e Leitura Clínica:** cálculo de IMC em tempo real e destaque visual de alergias e histórico para o médico.
   - **Agenda Médica estilo Google Agenda:** visões Dia, Semana e Mês com suporte a horários simultâneos sem sobreposição e atalhos para pré-prontuário e receitas.
