# MedFácil

Aplicativo mobile nativo (Android e iOS) do **MedFácil**, sistema de agendamento e acompanhamento médico desenvolvido como migração completa do PWA (`medfacil-pwa-main`) para **React Native (Expo) + TypeScript + NativeWind v4**, integrado à API REST `medfacil-backend`, sem uso de `WebView`.

Projeto apresentado como entrega final da disciplina ministrada pelo **Prof. Icaro Ferreira** (Faculdade Senac).

## Integrantes do Grupo

- Guilherme Lins Monteiro De Melo
- Jamesson Ferreira
- Arthur Miguel

## Perfis e Funcionalidades Implementadas

| Perfil | Funcionalidades Principais |
| :--- | :--- |
| **Paciente** | Login por CPF e senha, autocadastro completo (CPF, telefone, data de nascimento, sexo e endereço), tela inicial com próxima consulta, listagem e filtros de consultas (`FlatList`), detalhes da consulta com atalho **"Veja a melhor rota"** no Google Maps, agendamento em 3 etapas com revisão, confirmação de presença, reagendamento, cancelamento, **Minhas receitas**, **Minha saúde** (pré-prontuário com cálculo de IMC) e Perfil (`Dados pessoais`, `Notificações`, `Acessibilidade`, `Ajuda`) |
| **Médico** | Fila de atendimentos na tela inicial, envio de receitas médicas (`SendPrescriptionModal`), visualização clínica do pré-prontuário do paciente (`PatientPreChartModal` com IMC, tipo sanguíneo, alergias em destaque, comorbidades e histórico), aba **Hospitais** vinculados com especialidades resolvidas e aba **Agenda** estilo Google Agenda com visões **Dia**, **Semana** e **Mês** |
| **Administrador** | Painel administrativo com cadastro de especialidades, listagem e exclusão de médicos em cascata, cadastro de novos médicos com CRM e vínculo de especialidades, gestão de hospitais com vínculo de médicos compatíveis e gestão de horários disponíveis na agenda |

## Recursos Obrigatórios (Etapa 2) e Evidências no Código

| Categoria | Recurso | Evidência no Código |
| :--- | :--- | :--- |
| **Navegação** | `Stack Navigator` (`createNativeStackNavigator`) | `src/navigation/AuthStack.tsx`, `src/navigation/PatientStack.tsx` |
| **Navegação** | `Bottom Tabs` (`createBottomTabNavigator`) + barra flutuante customizada | `src/navigation/PatientTabs.tsx`, `src/navigation/DoctorTabs.tsx`, `src/navigation/AdminTabs.tsx`, `src/components/ui/FloatingTabBar.tsx` |
| **Animações e Transições** | `Slide` em modais, transições nativas de pilha/abas e rolagem animada no foco de inputs | `src/components/ui/Modal.tsx` (`animationType="slide"`), `src/navigation/*.tsx`, `scrollTo({ animated: true })` nos formulários |
| **Componentes Nativos e Estado** | `Modal` | 20 ocorrências em 16 arquivos (`src/components/ui/Modal.tsx`, modais clínicos, dropdowns e confirmações) |
| **Componentes Nativos e Estado** | `FlatList` | `src/screens/PatientConsultationsScreen.tsx`, `src/screens/PatientPrescriptionsScreen.tsx` |
| **Componentes Nativos e Estado** | `ScrollView` | 25 arquivos (`LoginScreen.tsx`, `RegisterScreen.tsx`, `PatientScheduleScreen.tsx`, `PatientHealthScreen.tsx`, `DoctorScheduleScreen.tsx`, `AdminHomeScreen.tsx` e demais telas) |
| **Componentes Nativos e Estado** | `Pressable` (substituto moderno recomendado para `TouchableOpacity`) | 30 arquivos (`FeatureCard.tsx`, `MainCard.tsx`, `Button.tsx`, `FloatingTabBar.tsx`, `LogoutButton.tsx`, cards e listas interativas) |
| **Componentes Nativos e Estado** | `TextInput` | `src/components/ui/Input.tsx` (consumido em Login, Cadastro, Minha saúde, Painel Admin e envio de receitas) |
| **Componentes Nativos e Estado** | `useState` e gerenciamento global | 22 arquivos com `useState`, além de stores Zustand (`src/stores/`) e formulários controlados com `react-hook-form` + `zod` |
| **Ícones** | `Icons` vetoriais em SVG (`react-native-svg`) e ilustrações médicas locais | `src/navigation/icons.tsx`, ícones em modais/UI (`21` arquivos com `react-native-svg`) e `assets/icons/` |

## Diferenciais Implementados (Desafio Extra)

- **Acessibilidade (WCAG):** áreas de toque mínimas de `48px` (com `hitSlop` calculado em componentes compactos como `LogoutButton` e botão de senha em `Input`), `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, alto contraste na paleta institucional (`#004959`, `#0e706f`, `#dff4f2`, `#F7C343`) e feedback explícito de erro (`accessibilityRole="alert"`).
- **Geolocalização e Rotas no Google Maps:** utilitário puro `src/utils/maps.ts` (`buildGoogleMapsRouteUrl` e `openBestRoute`) integrado ao botão **"Veja a melhor rota"** em `PatientAppointmentDetailsScreen.tsx`, ligando o endereço do paciente ao endereço real da clínica/hospital com fallback automático para localização atual do dispositivo.
- **Pré-Prontuário ("Minha saúde") e Leitura Clínica Médica:** formulário completo validado com Zod (`src/schemas/healthProfile.schema.ts`), cálculo de IMC (`calculateBmi`), persistência local segura (`expo-secure-store`) e modal clínico `PatientPreChartModal.tsx` com alertas visuais para alergias e histórico.
- **Agenda Médica Estilo Google Agenda:** visões por **Dia**, **Semana** e **Mês** no fuso `America/Recife` (`src/utils/calendar.ts` e `DoctorScheduleScreen.tsx`), distribuição em colunas para horários simultâneos, marcador de hora atual e atalhos para pré-prontuário e envio de receitas.
- **Gestão Administrativa Completa e Segurança:** cadastro de hospitais, compatibilidade por especialidade, horários avulsos integrados ao agendamento do paciente, persistência criptografada em `expo-secure-store` e suíte automatizada com **11 arquivos de teste (65 testes unitários)** em Vitest + TypeScript `strict`.

## Stack Tecnológica

- **Framework Mobile:** React Native `0.88.1` + Expo `~58.0` (`expo-linear-gradient`, `expo-secure-store`, `expo-status-bar`)
- **Linguagem e Estilização:** TypeScript (`strict`) + NativeWind v4 (`tailwindcss`)
- **Navegação:** `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-safe-area-context`
- **Estado, API e Validação:** Zustand, Axios, React Hook Form, Zod v4 (`@hookform/resolvers`)
- **Testes:** Vitest

## Estrutura de Pastas

```text
medfacil-mobile/
├── assets/icons/          # Logo da marca e ilustrações médicas 3D
├── docs/                  # Documentação de requisitos, casos de uso e backlog
├── src/
│   ├── __tests__/         # 11 suítes de testes unitários (65 testes)
│   ├── components/        # UI reutilizável (ui/, cards/, modals/, doctor/, schedule/)
│   ├── constants/         # Dados institucionais padrão da clínica
│   ├── navigation/        # RootNavigator, Stacks, Tabs, ícones e tipagens
│   ├── schemas/           # Schemas Zod (autenticação, receitas, admin, pré-prontuário)
│   ├── screens/           # Telas nativas dos fluxos Autenticação, Paciente, Médico e Admin
│   ├── services/          # Cliente HTTP Axios e camadas de serviço REST/locais
│   ├── stores/            # Stores Zustand (sessão, agendamentos, admin, receitas, saúde)
│   ├── types/             # Contratos TypeScript
│   └── utils/             # Datas America/Recife, calendário, CPF, máscaras, mapas e especialidades
├── app.json
├── package.json
└── README.md
```

## Instalação e Execução Passo a Passo (Expo)

### Pré-requisitos

- **Node.js 20+** e **npm**
- App **Expo Go** instalado no celular (Android ou iOS) ou emulador configurado
- API `medfacil-backend` em execução na porta `3000` (com banco populado via `npm run db:seed`, se aplicável)

### Passos

1. **Clonar o repositório e acessar a pasta do aplicativo:**

   ```bash
   git clone <url-do-repositorio>
   cd medfacil-mobile
   ```

2. **Instalar as dependências:**

   ```bash
   npm install
   ```

3. **Configurar a variável de ambiente da API (`.env`):**

   Copie o arquivo de exemplo para criar o `.env`:

   ```bash
   cp .env.example .env
   ```

   No PowerShell (Windows), você também pode usar:

   ```powershell
   Copy-Item .env.example .env
   ```

   Edite o arquivo `.env` e defina `EXPO_PUBLIC_API_URL` de acordo com o ambiente de execução:

   | Ambiente | Valor de `EXPO_PUBLIC_API_URL` |
   | :--- | :--- |
   | Dispositivo físico (Expo Go na mesma rede Wi-Fi) | `http://<IP-da-sua-maquina>:3000/api/v1` |
   | Emulador Android | `http://10.0.2.2:3000/api/v1` |
   | Simulador iOS | `http://localhost:3000/api/v1` |

4. **Iniciar o servidor de desenvolvimento do Expo:**

   ```bash
   npx expo start
   ```

5. **Abrir o aplicativo:**

   Escaneie o QR Code exibido no terminal pelo aplicativo **Expo Go** (no Android ou câmera no iOS), ou pressione `a` para abrir no emulador Android / `i` no simulador iOS.

## Testes e Validação Técnica

Execute os comandos abaixo dentro de `medfacil-mobile`:

```bash
# Validar tipagem TypeScript estrita
npx tsc --noEmit

# Executar todos os testes unitários (11 arquivos, 65 testes)
npm test
```

## Build com EAS Build

As configurações de build nativo ficam em [eas.json](eas.json) e os identificadores em [app.json](app.json):

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

## Documentação Complementar

| Documento | Conteúdo |
| :--- | :--- |
| [Project Charter](docs/project-charter.md) | Visão, justificativa, objetivos e escopo |
| [Requisitos](docs/requisitos.md) | Requisitos funcionais e não funcionais |
| [Casos de Uso](docs/casos-de-uso.md) | Atores e especificação detalhada |
| [User Stories](docs/user-stories.md) | Histórias com critérios BDD |
| [Backlog de Issues](docs/backlog-issues.md) | Backlog estruturado do projeto |
| [Plano de Migração](../docs/plano-migracao-react-native.md) | Estratégia de migração do PWA para React Native |

## Licença

ISC, alinhada ao `package.json` do projeto.
