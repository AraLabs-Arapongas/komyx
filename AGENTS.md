<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Interface sai do design system, sempre

Nada de `<input>`, `<button>` ou primitivo solto na tela. Toda peça visual vem do design system. **Se o componente não existe, o trabalho é criá-lo lá — não improvisar no lugar de uso.**

Onde o sistema mora:

- `src/components/ui/` — primitivos (Input, Button, Label…)
- `src/components/campos.tsx` — campos com máscara (valor, data, percentual, inteiro)
- `src/components/valor.tsx` — o único renderizador de dinheiro, que também aplica o modo privacidade
- `src/app/globals.css` — tokens de cor e utilitários no `@theme`

## A decisão mora no componente, não na chamada

Altura, espaçamento, cor e tipografia são decisões do componente. Quando a chamada precisa dizer `className="h-12"`, a decisão vazou para o lugar errado — e cada repetição é uma chance de esquecer.

Foi exatamente assim que o campo de cliente saiu com altura diferente de todos os outros: `Input` nasce com `h-8`, altura de desktop denso, então cada formulário escrevia `h-12` na mão. O `ClientePicker` renderiza o `Input` por dentro e não aceita `className` — ele não tinha como obedecer. O `Button` já faz certo, com variante de tamanho; o `Input` é que não ganhou o mesmo tratamento.

Regra prática: se você está prestes a escrever classe de dimensão ou de cor numa chamada, pare — ou o componente precisa de uma variante, ou precisa de um padrão melhor.

## Ao criar um componente novo

Nomeie e comente em português, como o resto do código. Dê variantes em vez de aceitar classes soltas. E confira antes se algum existente resolve com uma variante a mais: dois componentes que fazem quase a mesma coisa reintroduzem a divergência que este documento existe para evitar.
