# FPSO Atlântico

Explorador 3D de uma unidade flutuante de produção, armazenamento e transferência. Modelo conceitual de casco com 320 m de comprimento e 60 m de boca. As dimensões, arranjos, profundidade submarina e animações são ilustrativos; não representam uma unidade real, um projeto executivo ou telemetria.

## Explorar

- Arraste para girar e role ou use dois dedos para aproximar.
- Selecione um sistema na lista ou diretamente na cena.
- Separe e reagrupe módulos pelo controle de vista explodida.
- Alterne iluminação, intensidade das ondas, estrutura em linhas e fluxos ilustrativos.
- Use as câmeras de perspectiva, convés, lateral e sistemas submarinos.

## Código

A aplicação usa TypeScript, Three.js e React sobre o starter Vinext de Sites. Não carrega arquivos de modelos 3D ou texturas externas.

- `app/fpso-model.ts`: perfis de casco, vasos, estruturas, tubulações, guindastes, acomodações, heliponto, flare, risers e ancoragem; primitivas repetidas agrupadas com InstancedMesh.
- `app/fpso-scene.ts`: câmera, iluminação, oceano procedural, animações, seleção e limpeza dos recursos WebGL.
- `app/explorer.tsx`: controles acessíveis e interface responsiva em português.
- `app/fpso-data.ts`: conteúdo dos sete sistemas.

A taxa de quadros exibida é medida no dispositivo, não uma meta fixa. A geometria contém aproximadamente 1.840 primitivas, agrupadas em cerca de 101 objetos de desenho antes das linhas de fluxo e do ambiente.

## Desenvolvimento

Use os scripts de instalação e compilação de Sites fornecidos no projeto. O build é produzido por `npm run build`. O navegador precisa de suporte a WebGL 2.

Referência sobre FPSOs: [Petrobras](https://petrobras.com.br/pt/quem-somos/vida-na-plataforma).
