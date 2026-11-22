# MedFácil Mobile

![Versão](https://img.shields.io/badge/vers%C3%A3o-v0.3.0-0e706f)
![Licença](https://img.shields.io/badge/licen%C3%A7a-ISC-004959)
![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-61DAFB?logo=react&logoColor=black)
![NativeWind](https://img.shields.io/badge/NativeWind-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

Aplicativo mobile (Android e iOS) do **MedFácil**, sistema de agendamento de consultas médicas. É a migração do PWA (`medfacil-pwa-main`) para **Expo + React Native + TypeScript**, consumindo a mesma API REST do `medfacil-backend`, com foco em **acessibilidade** e **agendamento médico simples**.

> **Status:** `v0.3.0`. Entregas do MVP implementadas para Paciente, Médico e Administrador, com persistência segura via `expo-secure-store`, testes unitários com Vitest e configuração de build no `eas.json`.

## Perfis

| Perfil | O que faz |
| :--- | :--- |
| Paciente | Cadastra-se, visualiza consultas, agenda em 4 etapas, reagenda e cancela consultas |
| Médico | Consulta próximas consultas agrupadas por dia no fuso `America/Recife` |
| Administrador | Gerencia especialidades e cadastra médicos com CRM |

## Funcionalidades

| Funcionalidade | RF / RNF | PWA / API (referência) | Mobile (`v0.3.0`) |
| :--- | :--- | :--- | :--- |
| Login por CPF e senha | RF01 | Implementado | Implementada (`v0.3.0`) |
| Redirecionamento e proteção por role | RF02 | Implementado | Implementada (`v0.3.0`) |
| Logout | RF03 | Implementado | Implementada (`v0.3.0`) |
| Cadastro de paciente (CPF validado) | RF04 | Implementado | Implementada (`v0.3.0`) |
| Home do paciente (próxima consulta) | RF05 | Implementado | Implementada (`v0.3.0`) |
| Agendamento em 4 etapas + revisão | RF06 | Implementado | Implementada (`v0.3.0`) |
| Listar agendamentos | RF07 | Implementado | Implementada (`v0.3.0`) |
| Reagendar consulta | RF08 | API pronta; fluxo parcial no PWA | Implementada (`v0.3.0`) |
| Cancelar consulta | RF09 | Implementado | Implementada (`v0.3.0`) |
| Agenda do médico (próximas consultas por dia) | RF10 | Implementado (sem filtro por período) | Implementada (`v0.3.0`) |
| Gestão de especialidades | RF11 | Implementado | Implementada (`v0.3.0`) |
| Cadastro de médico com CRM | RF12 | Implementado | Implementada (`v0.3.0`) |
| Sessão segura (`expo-secure-store`) | RNF01 | Usa `localStorage` | Implementada (`v0.3.0`) |
| Acessibilidade (alvos >= 48px e rótulos) | RNF03 / RNF04 | Parcial | Implementada (`v0.3.0`) |
| Testes unitários (utils e schemas) | Qualidade | N/A | Implementada (`v0.3.0`) |
| Configuração EAS Build (APK e produção) | Portabilidade | N/A | Implementada (`v0.3.0`) |
| Esqueci minha senha | N/A | Apenas visual | Fora do escopo |
| Receitas, prontuário, exames, notificações | N/A | Placeholders | Fora do escopo |
| Agenda geral, bloqueios e indicadores admin | N/A | Dados fictícios | Fora do escopo |

## Stack

Expo · React Native · React Navigation · TypeScript (`strict`) · NativeWind v4 · Zustand · Axios · Zod · React Hook Form · `expo-secure-store` · Vitest · EAS Build.

## Instalação e execução (Expo Go)

**Pré-requisitos:** Node.js 20+ (`.nvmrc` do projeto web), npm, app **Expo Go** no celular (Android/iOS) e a API `medfacil-backend` em execução (`npm run dev`, porta `3000`).

```bash
# 1. Clonar e entrar na pasta
git clone <url-do-repositorio>
cd medfacil-mobile

# 2. Instalar dependências
npm install

# 3. Configurar a URL da API
cp .env.example .env
# edite EXPO_PUBLIC_API_URL, ex.: http://192.168.0.10:3000/api/v1

# 4. Iniciar o Metro
npx expo start
```

5. Abra o **Expo Go** e escaneie o QR Code (celular e computador na mesma rede Wi-Fi).
6. Para testar login, use um usuário do `seed` do backend (`npm run db:seed` em `medfacil-backend`).

| Ambiente | `EXPO_PUBLIC_API_URL` |
| :--- | :--- |
| Dispositivo físico (Expo Go) | `http://<IP-da-sua-máquina>:3000/api/v1` |
| Emulador Android | `http://10.0.2.2:3000/api/v1` |
| Simulador iOS | `http://localhost:3000/api/v1` |

> `localhost` **não** funciona em dispositivo físico. Em produção use HTTPS. O backend precisa permitir a origem via `CORS_ORIGIN` quando aplicável.

## Testes automatizados e verificação de tipos

```bash
# Executar suíte unitária (CPF, máscaras, datas America/Recife e schemas Zod)
npm test

# Validar tipagem TypeScript estrita
npm run typecheck
```

## Build de instalação com EAS Build

As configurações de build ficam em [eas.json](eas.json) e os identificadores nativos (`android.package` e `ios.bundleIdentifier`) em [app.json](app.json).

```bash
# 1. Instalar a CLI do EAS (globalmente) e autenticar na conta Expo
npm install -g eas-cli
eas login

# 2. Gerar APK Android para instalação direta em dispositivos de teste
eas build -p android --profile preview

# 3. Outros perfis disponíveis
eas build -p android --profile development   # Development Client
eas build -p all --profile production        # Pacotes de produção (Android e iOS)
```

## Documentação

| Documento | Conteúdo |
| :--- | :--- |
| [Project Charter](docs/project-charter.md) | Visão, justificativa, objetivos SMART, escopo e stakeholders |
| [Requisitos](docs/requisitos.md) | RF01 a RF12 e RNF01 a RNF08 |
| [Casos de Uso](docs/casos-de-uso.md) | Atores e especificação detalhada |
| [User Stories](docs/user-stories.md) | Histórias com critérios BDD |
| [Backlog de Issues](docs/backlog-issues.md) | 15 issues prontas para o GitHub |
| [Plano de Migração](../docs/plano-migracao-react-native.md) | Auditoria e roadmap técnico |

## Fluxo de branches e versionamento

### Git Flow

| Branch | Origem | Destino | Finalidade |
| :--- | :--- | :--- | :--- |
| `main` | N/A | N/A | Código estável de produção; cada merge recebe uma tag SemVer |
| `develop` | `main` | `main` (via release) | Integração contínua do desenvolvimento |
| `feature/issue-XX-descricao` | `develop` | `develop` (PR) | Nova funcionalidade vinculada à issue |
| `release/vX.Y.Z` | `develop` | `main` e `develop` | Estabilização e ajustes finais da versão |
| `hotfix/vX.Y.Z-descricao` | `main` | `main` e `develop` | Correção urgente em produção |

### Conventional Commits

Formato: `tipo(escopo): descrição (#issue)`

| Tipo | Uso | Efeito SemVer |
| :--- | :--- | :--- |
| `feat` | Nova funcionalidade | MINOR |
| `fix` | Correção de bug | PATCH |
| `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf` | Demais mudanças | Nenhum |
| `feat!` / `BREAKING CHANGE:` | Quebra de compatibilidade | MAJOR |

Exemplo: `feat(patient): adiciona etapa de horários no agendamento (#11)`

### SemVer

`MAJOR.MINOR.PATCH`: a versão atual é `v0.3.0` (pré-1.0: API interna ainda pode mudar). Tags `vX.Y.Z` são criadas na `main` ao fechar cada release.

## Licença

ISC, alinhada ao `package.json` do backend. Confirme ou atualize antes da publicação.
