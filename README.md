# Web Motion Library

Biblioteca original de 10 presets parametrizáveis, com catálogo interativo e estudo visual do Monks. Não é uma cópia do site. Nenhum vídeo, fotografia, fonte, SVG ou script proprietário é usado pelos efeitos. Capturas em `evidence/` servem somente à documentação da análise.

## Abrir

Requer Node.js 20+; não precisa instalar pacotes.

No Windows, você também pode executar `Iniciar.bat` e abrir o endereço exibido.

```sh
npm start
```

Abra o endereço http://127.0.0.1 com a porta que aparecer no terminal. Alternativa: `node server.mjs`. O Windows escolhe uma porta livre por padrão; a variável PORT fixa uma porta. O servidor é local e escuta apenas 127.0.0.1. Abrir index.html por file:// não funciona com módulos/fetch; use o servidor.

## Conteúdo

- `index.html`: catálogo com busca, seleção, preview, reprodução/reset, controles e exportação JSON.
- `manifest.json`: fonte de verdade dos presets, parâmetros, origem, grau de evidência e limites.
- `lib/motion.js` e `lib/motion.css`: biblioteca sem dependências.
- `report.html`: relatório visual com URLs, passos e capturas.
- `examples/basic.html`: integração HTML com gatilhos reais.
- `examples/Motion.jsx`: adaptador React com cleanup (exemplo para seu bundler; React não é dependência do catálogo).
- `tests/`: testes Node e testes de comportamento em navegador.
- `templates/site-analysis.json`: roteiro extensível para outros sites.

## Uso JavaScript

```js
import {createMotion, mount} from './lib/motion.js';
const manifest = await fetch('./manifest.json').then(r => r.json());
const preset = manifest.presets.find(p => p.id === 'word-rise');
const motion = createMotion(document.querySelector('h2'), preset, {
  duration: 800, trigger: 'scroll'
});
// Outros controles:
await motion.play(); // replay manual; também funciona com outros triggers
motion.reset();     // remove animações e volta ao CSS original
motion.destroy();   // listeners, observer, RAF, texto e estilos restaurados
```

Ou use `<h2 data-motion="word-rise">Sua ideia</h2>` e `const cleanup = mount(document, manifest)`. O atributo `data-trigger="load"` sobrescreve o gatilho. Chame cleanup ao desmontar a página. Elementos adicionados depois exigem novo mount no respectivo container.

## Parâmetros e contrato

| Chave | Unidade / valores | Aplicação |
|---|---|---|
| duration, delay | ms, >= 0 | Web Animations API |
| easing | CSS easing válido | Curva; não mede a referência |
| translate | [x, y] em px | Posição inicial da entrada; amplitude do drift |
| scale | número > 0 | Escala inicial; escala constante no drift |
| opacity | 0–1 | Opacidade inicial ou piso de leitura |
| stagger | ms | Intervalo entre palavras; cartões independentes usam delay por índice |
| trigger | manual / load / scroll / hover | Reprodução manual, montagem, interseção/scroll ou ponteiro/foco |
| once | boolean | Entrada por interseção uma vez (padrão) ou nova entrada após saída |
| threshold | 0–1 | Limiar do IntersectionObserver |
| responsive | objeto de regras | Menor maxWidth compatível vence; sobrescrita sobre opções base |
| reducedMotion | boolean | Força redução no preview/teste; preferência do SO também respeitada |

Exemplo de regra: `{mobile:{maxWidth:640,duration:500,translate:[0,18]},tablet:{maxWidth:960,translate:[0,24]}}`. Overrides responsive mesclam por nome de regra. Para alterar um parâmetro explicitamente também no mobile, inclua o valor na regra. O playground neutraliza essas regras enquanto você edita, para mostrar os valores escolhidos nos controles; a biblioteca de produção conserva os defaults mobile.

Kinds suportados: `reveal`, `words`, `scrub`, `swap`, `mask`, `drift`, `outline`. `words` usa stagger temporal. `scrub` usa progressão por posição, não duration. `drift` acompanha scroll sem easing temporal. `swap` mede a largura do círculo/rótulo, não usa translate/scale/opacity/stagger. `outline` revela um elemento de borda fornecido pelo consumidor. Controles sem aplicação ao kind não alteram sua semântica.

Em trigger scroll: scrub/drift acompanham a posição do elemento ao longo de viewport + altura; outros kinds usam IntersectionObserver. Em manual/load/hover, scrub e drift oferecem uma passagem temporal para preview. O botão Reproduzir do catálogo pode demonstrar qualquer preset; selecione Scroll real para observar o vínculo ao viewport.

### Botão com troca de lado

```html
<button class="wml-button" data-motion="cta-swap">
  <span class="wml-button-label">Conhecer</span>
  <span class="wml-button-arrow" aria-hidden="true">→</span>
</button>
```

Os movimentos ficam em wrappers próprios. Evite aplicar a biblioteca a elementos que já recebem transform ou animações de outra ferramenta. Para imagens use container com `wml-clip` e mídia própria dentro dele. Para parallax assegure overscan suficiente no container; no mobile o preset media-drift neutraliza o deslocamento.

### Grupos de cartões

```js
const p = manifest.presets.find(p=>p.id==='card-reveal');
const group = [...document.querySelectorAll('.card')].map((el,i)=>
  createMotion(el,p,{delay:i*p.options.stagger}));
// Ao desmontar: group.forEach(c=>c.destroy())
```

## Acessibilidade e desempenho

- Sem JavaScript, o conteúdo permanece visível. As entradas por interseção só recebem animação ao cruzar o limiar; não escondem conteúdo antecipadamente.
- `prefers-reduced-motion` zera duration/delay/stagger, translate e escala e mantém texto legível; mudanças da preferência e resize atualizam controllers existentes.
- Texto animado contém uma única cópia acessível e uma camada visual aria-hidden. Use palavras/scrub em nós de **texto simples**. Markup e links internos não são preservados durante o efeito; destroy restaura os nós originais. Para conteúdo rico anime o wrapper com reveal.
- Hover tem equivalência por foco; em dispositivos touch a ação do botão continua imediata. A biblioteca não intercepta cliques.
- `menu-reveal` e `overlay-enter` são primitivas visuais, não componentes completos de navegação/dialog. Use elementos semânticos e implemente foco, Escape, aria-expanded e foco de retorno na sua aplicação. O catálogo demonstra apenas a entrada.
- Scroll usa listener passivo e requestAnimationFrame. Reveals usam transform/opacidade/clip-path e não animam altura. Isso não representa uma medição de FPS ou garantia de custo zero; profile na página final.
- Sem detecção obrigatória de WAAPI: navegadores sem Element.animate exigem polyfill ou não inicializar a biblioteca. Alvo de teste: navegador Chromium desta sessão.

## Testes

```sh
npm test
```

Com servidor ativo, abra `/tests/browser.html` e clique Executar testes. Verifica animação final, replay/cleanup, texto acessível, eventos pointer/focus, modo reduzido forçado, interseção, scrub, mount e breakpoint/overflow. Os eventos de pointer/focus do harness são sintéticos; a inspeção manual do site foi feita separadamente.

Repita em 390, 768 e 1280 px. O resultado mostra viewport e contagem. Veja `validation.json` para resultados efetivamente executados nesta entrega. Preferência de movimento reduzido é testada via override da biblioteca, sem afirmar emulação da configuração do SO. O exemplo React foi revisado, mas não compilado nem montado nesta entrega.

## Ampliar o repertório

1. Duplique `templates/site-analysis.json` para a próxima referência.
2. Navegue e capture antes/depois de cada interação. Registre viewport real, URL e seção.
3. Separe observado, estimado e não confirmado. Só chame duração de medida se houver trace e método registrado.
4. Crie parâmetros originais; não copie código/assets. Guarde screenshots como documentação.
5. Adicione um registro ao manifest com kind suportado. `registerPreset` permite registro em memória com validação de colisão. Um kind novo exige extensão de keyframes/createMotion e respectivos testes.
6. Rode testes e examine teclado, mobile e movimento reduzido. Atualize relatório e validation.json.

## Limites da análise

Inspeção de uma amostra de páginas em 29/10/2026, navegador integrado. Desktop da sessão aproximadamente 1242 px na captura inicial, mobile configurado 390 × 844. Não houve captura de vídeo/trace ou comparação controlada de frames com relógio. O valor de 30 px de palavras e 70 px do rótulo vem de estados inline do DOM, não de um rastreamento temporal. Sem inferir GSAP, Lenis, SPA, taxas de frames ou breakpoints de produção. O menu mobile, fluxo editorial, overlay e estrutura foram observados; parallax, máscaras e scrub exatos não foram comprovados. Consulte report.html e o campo evidence de cada preset.

## Licença

Código original da biblioteca: MIT (LICENSE). Capturas de referência mantêm direitos de seus respectivos titulares, não estão licenciadas como assets reutilizáveis. Remova evidence/ e report.html se distribuir apenas o runtime. Não há afiliação com Monks.
