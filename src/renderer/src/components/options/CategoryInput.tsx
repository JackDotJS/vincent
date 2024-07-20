import { JSXElement, createSignal, onMount } from 'solid-js';
// import { StateContext } from '../../state/StateController';
// import * as i18n from '@solid-primitives/i18n';
import style from './CategoryInput.module.css';


// TODO: signal to prevent inputs to other buttons while rebinding
// TODO: highlight keybind button when activing rebinding
// TODO: ability to delete and create new keybinds, probably just gonna copy blender's solution to this
const CategoryInput = (props: { newConfig: unknown, setNewConfig: unknown }): JSXElement => {
  // const { dictionary } = useContext(StateContext);
  // const t = i18n.translator(() => dictionary(), i18n.resolveTemplate);

  const t = (...a: string[]): string => a && ``;

  const [listening, setListening] = createSignal(false);

  let buttonTarget: HTMLButtonElement | null = null;
  let oldLabel = ``;
  let currentKeyCombo = ``;

  const beginRebind = (ev: Event): void => {
    setListening(true);
    buttonTarget = ev.target as HTMLButtonElement;
    oldLabel = buttonTarget.innerText;

    buttonTarget.innerText = `...`;

    console.debug(`begin rebind`);
  };

  const finishRebind = (ev: MouseEvent|Event): void => {
    if (!listening() || buttonTarget == null) return;
    ev.preventDefault();

    setListening(false);

    console.debug(currentKeyCombo);

    buttonTarget.innerText = currentKeyCombo.toUpperCase();

    currentKeyCombo = ``;

    console.debug(`finish rebind`);
  };

  onMount(() => {
    document.addEventListener(`keydown`, (ev: KeyboardEvent) => {
      if (!listening() || buttonTarget == null) return;
      ev.preventDefault();

      if (ev.code === `Escape`) {
        setListening(false);
        currentKeyCombo = ``;

        buttonTarget.innerText = oldLabel;
        
        console.debug(`rebind cancelled`);
        return;
      }

      if (ev.repeat) return;

      if (currentKeyCombo.length > 0) {
        currentKeyCombo += ` + `;
      }

      switch (ev.code) {
        case `Control`:
          currentKeyCombo += `Ctrl`;
          break;
        case ` `:
          currentKeyCombo += `Space`;
          break;
        default:
          currentKeyCombo += ev.code;
      }

      console.debug(currentKeyCombo);
    });

    document.addEventListener(`keyup`, finishRebind);

    document.addEventListener(`mousedown`, (ev: MouseEvent) => {
      if (!listening() || buttonTarget == null) return;
      ev.preventDefault();

      if (currentKeyCombo.length > 0) {
        currentKeyCombo += ` + `;
      }

      switch (ev.button) {
        case 0:
          currentKeyCombo += `Left Mouse`;
          break;
        case 1:
          currentKeyCombo += `Middle Mouse`;
          break;
        case 2:
          currentKeyCombo += `Right Mouse`;
          break;
        case 3:
          currentKeyCombo += `Back`;
          break;
        case 4:
          currentKeyCombo += `Forward`;
          break;
      }
    });

    document.addEventListener(`contextmenu`, (ev: MouseEvent) => {
      if (!listening() || buttonTarget == null) return;
      ev.preventDefault();
    });

    document.addEventListener(`mouseup`, finishRebind);

    // just to make the warning shut up for now
    console.debug(props.newConfig, props.setNewConfig);
  });

  return (
    <>
      <div classList={{ [style.disableClicks]: listening() }} />
      <input placeholder={t(`options.input.searchKb`)} type="text" />
      <div class={style.kbLegend}>
        <span class={style.kbLegendTitle}>Action</span>
        <span class={style.kbLegendPrimary}>Keybind</span>
      </div>
      <div class={style.kbActionItem}>
        <label>
          <input type="checkbox" checked/>
        </label>
        <input type="text" value="example keybind" />
        <button onClick={(ev) => beginRebind(ev)}>CTRL + A</button>
      </div>
    </>
  );
};

export default CategoryInput;