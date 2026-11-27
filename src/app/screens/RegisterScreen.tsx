import { useMemo, useReducer, useState, type FormEvent, type ReactNode } from 'react';
import { colorwaysFor, sizesFor } from '../../catalog/catalog';
import { searchColorways } from '../../catalog/search';
import type { Catalog, Colorway, NewBottle, PaletteSlot } from '../../domain/types';
import { resolvePalette, type ResolvedPalette } from '../../theme/theme';
import {
  canContinue,
  initialRegisterState,
  registerReducer,
  stepNumber,
  toNewBottle,
  type RegisterState,
} from '../register/registerFlow';
import { BottleArt, THEME_COLORS } from '../ui/BottleArt';
import { BackIcon, CheckIcon } from '../ui/icons';

/** The biggest size any Model comes in, so bottle drawings can show relative size. */
const BIGGEST_OZ = 64;

function StepDots({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="step-dots" role="img" aria-label={`Step ${current} of 4`}>
      {([1, 2, 3, 4] as const).map((n) => {
        if (n < current)
          return (
            <span key={n} className="dot done">
              <CheckIcon size={14} />
            </span>
          );
        return (
          <span key={n} className={n === current ? 'dot now' : 'dot later'}>
            {n}
          </span>
        );
      })}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange(hex: string): void }) {
  return (
    <label className="color-field">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span>{label}</span>
    </label>
  );
}

/** Three-ringed swatch of a Palette, as in the colorway list. */
function Swatch({ palette, sampled }: { palette: ResolvedPalette; sampled: boolean }) {
  return (
    <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden="true" focusable="false">
      <circle cx="42" cy="42" r="40" fill={palette.body} stroke="var(--color-text)" strokeWidth="2" strokeDasharray={sampled ? undefined : '6 5'} />
      <circle cx="42" cy="42" r="25" fill={palette.lid} stroke="var(--color-text)" strokeWidth="2" />
      <circle cx="42" cy="42" r="10" fill={palette.accent} stroke="var(--color-text)" strokeWidth="2" />
    </svg>
  );
}

function ColorwayTile({ colorway, picked, onPick }: { colorway: Colorway; picked: boolean; onPick(): void }) {
  return (
    <button type="button" className="tile" aria-pressed={picked} onClick={onPick}>
      <span className={picked ? 'tile-swatch on' : 'tile-swatch'}>
        <Swatch palette={resolvePalette(colorway.palette)} sampled={colorway.sampled} />
      </span>
      {picked ? (
        <span className="tile-check">
          <CheckIcon />
        </span>
      ) : null}
      <span className="tile-name">{colorway.name}</span>
    </button>
  );
}

/** Register a Bottle: Model, then Size, then Colorway (or a Custom one), then an optional nickname. */
export function RegisterScreen({
  catalog,
  onSave,
  onLeave,
}: {
  catalog: Catalog;
  onSave(bottle: NewBottle): Promise<void>;
  onLeave(): void;
}) {
  const [state, dispatch] = useReducer(registerReducer, undefined, initialRegisterState);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const model = catalog.models.find((m) => m.id === state.modelId);
  const colorways = useMemo(
    () => (state.modelId !== null && state.sizeOz !== null ? colorwaysFor(catalog, state.modelId, state.sizeOz) : []),
    [catalog, state.modelId, state.sizeOz],
  );
  const shown = useMemo(() => searchColorways(colorways, query), [colorways, query]);
  const picked = colorways.find((c) => c.id === state.colorwayId);

  function back() {
    if (state.step === 'model') onLeave();
    else dispatch({ type: 'back' });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const bottle = toNewBottle(state);
    if (!bottle || saving) return;
    setSaving(true);
    try {
      await onSave(bottle);
    } finally {
      setSaving(false);
    }
  }

  const chips = (
    <div className="chips">
      {model ? (
        <button type="button" className="chip tilt-left" aria-label={`Change model, ${model.name}`} onClick={() => dispatch({ type: 'goTo', step: 'model' })}>
          {model.name}
        </button>
      ) : null}
      {state.sizeOz !== null ? (
        <button type="button" className="chip tilt-right" aria-label={`Change size, ${state.sizeOz} oz`} onClick={() => dispatch({ type: 'goTo', step: 'size' })}>
          {state.sizeOz} oz
        </button>
      ) : null}
    </div>
  );

  let body: ReactNode;
  let footer: ReactNode = null;
  let heading: string;

  switch (state.step) {
    case 'model':
      heading = 'Which model?';
      body = (
        <div className="card-grid">
          {catalog.models.map((m, i) => (
            <button
              type="button"
              key={m.id}
              className={i % 2 === 0 ? 'card tilt-left' : 'card tilt-right'}
              aria-label={m.name}
              aria-pressed={state.modelId === m.id}
              onClick={() => dispatch({ type: 'chooseModel', modelId: m.id })}
            >
              <BottleArt colors={THEME_COLORS} width={34} height={68} />
              <span className="card-name">{m.name}</span>
              <span className="card-sub">{m.sizesOz.join(' · ')} oz</span>
            </button>
          ))}
        </div>
      );
      break;

    case 'size':
      heading = 'How big?';
      body = (
        <div className="size-row">
          {sizesFor(catalog, state.modelId ?? '').map((s) => (
            <button
              type="button"
              key={s}
              className="size-button"
              aria-pressed={state.sizeOz === s}
              onClick={() => dispatch({ type: 'chooseSize', sizeOz: s })}
            >
              <BottleArt colors={THEME_COLORS} width={30 + (s / BIGGEST_OZ) * 26} height={60 + (s / BIGGEST_OZ) * 52} />
              <span>{s} oz</span>
            </button>
          ))}
        </div>
      );
      break;

    case 'colorway':
      heading = 'Which colorway is yours?';
      body = (
        <>
          <label className="visually-hidden" htmlFor="colorway-search">
            Search colorways
          </label>
          <input
            id="colorway-search"
            type="search"
            className="search"
            placeholder="Search colorways"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          <div className="tile-grid" data-testid="colorway-list">
            {shown.map((c) => (
              <ColorwayTile key={c.id} colorway={c} picked={state.colorwayId === c.id} onPick={() => dispatch({ type: 'chooseColorway', colorwayId: c.id })} />
            ))}
          </div>
          {shown.length === 0 ? <p className="plain-text">Nothing by that name yet. Make your own colorway below.</p> : null}
        </>
      );
      footer = (
        <>
          {picked && !picked.sampled ? (
            <p className="callout" role="status">
              Colors not sampled yet — you can set your own on the next step. Until then it shows a neutral color.
            </p>
          ) : null}
          <button type="button" className="dashed-button" onClick={() => dispatch({ type: 'startCustom', name: query.trim() })}>
            My colorway isn&apos;t listed: make my own
          </button>
          <button type="button" className="big-button primary" disabled={!canContinue(state)} onClick={() => dispatch({ type: 'next' })}>
            Next: give it a nickname
          </button>
          <span className="fine-print centered">Colors are our own measurements, not Owala&apos;s.</span>
        </>
      );
      break;

    case 'custom': {
      heading = 'Make your own colorway';
      const { body: bodyColor, lid, accent } = state.custom;
      body = (
        <>
          <div className="preview">
            <BottleArt colors={{ body: bodyColor, lid, accent }} width={96} height={192} />
          </div>
          <label className="field">
            <span>Colorway name</span>
            <input value={state.custom.name} onChange={(e) => dispatch({ type: 'editCustom', patch: { name: e.target.value } })} maxLength={60} autoComplete="off" />
          </label>
          <div className="color-fields">
            <ColorField label="Body color" value={bodyColor} onChange={(hex) => dispatch({ type: 'editCustom', patch: { body: hex } })} />
            <ColorField label="Lid color" value={lid} onChange={(hex) => dispatch({ type: 'editCustom', patch: { lid: hex } })} />
            <ColorField label="Accent color" value={accent} onChange={(hex) => dispatch({ type: 'editCustom', patch: { accent: hex } })} />
          </div>
        </>
      );
      footer = (
        <button type="button" className="big-button primary" disabled={!canContinue(state)} onClick={() => dispatch({ type: 'next' })}>
          Next: give it a nickname
        </button>
      );
      break;
    }

    case 'nickname': {
      heading = 'Give it a nickname?';
      const previewColors = nicknamePreview(state, picked);
      const showColors = !state.isCustom && picked && !picked.sampled;
      body = (
        <form id="nickname-form" onSubmit={(e) => void save(e)}>
          <div className="preview">
            <BottleArt colors={previewColors} width={96} height={192} />
          </div>
          <label className="field">
            <span>Nickname (optional)</span>
            <input
              value={state.nickname}
              onChange={(e) => dispatch({ type: 'setNickname', nickname: e.target.value })}
              placeholder="Gym bottle"
              maxLength={40}
              autoComplete="off"
              enterKeyHint="done"
            />
          </label>
          {showColors ? (
            <fieldset className="color-set">
              <legend>Colors</legend>
              <p className="plain-text">Colors not sampled yet. You can set your own.</p>
              <div className="color-fields">
                {(['body', 'lid', 'accent'] as const).map((slot: PaletteSlot) => (
                  <ColorField
                    key={slot}
                    label={`${slot[0]!.toUpperCase()}${slot.slice(1)} color`}
                    value={previewColors[slot]}
                    onChange={(hex) => dispatch({ type: 'setColor', slot, hex })}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}
        </form>
      );
      footer = (
        <button type="submit" form="nickname-form" className="big-button primary" disabled={saving}>
          Add to shelf
        </button>
      );
      break;
    }
  }

  return (
    <section className="screen register" aria-labelledby="register-heading">
      <div className="register-top">
        <button type="button" className="round-button" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <StepDots current={stepNumber(state)} />
        <span className="register-top-spacer" />
      </div>
      <div className="register-body">
        <h1 id="register-heading">{heading}</h1>
        {state.step === 'colorway' || state.step === 'custom' || state.step === 'nickname' ? chips : null}
        {body}
      </div>
      {/* Keyed by step so each step gets its own buttons: React must not reuse one button node as a type="button" on one step and the submit button on the next, or the tap that moves on would also submit. */}
      {footer ? (
        <div className="register-footer" key={state.step}>
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/** The colors the nickname step draws: the Custom colorway's, or the Catalog colorway's with any hand-set colors. */
function nicknamePreview(state: RegisterState, picked: Colorway | undefined): ResolvedPalette {
  if (state.isCustom) {
    const { body, lid, accent } = state.custom;
    return { body, lid, accent };
  }
  return resolvePalette(picked?.palette ?? { body: '#4a6572' }, state.overrides);
}
