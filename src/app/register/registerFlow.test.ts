import { describe, expect, it } from 'vitest';
import {
  canContinue,
  initialRegisterState,
  registerReducer,
  stepNumber,
  toNewBottle,
  type RegisterAction,
  type RegisterState,
} from './registerFlow';

function run(...actions: RegisterAction[]): RegisterState {
  return actions.reduce(registerReducer, initialRegisterState());
}

describe('the register flow', () => {
  it('starts on the Model step with nothing chosen and cannot make a Bottle yet', () => {
    const s = initialRegisterState();
    expect(s.step).toBe('model');
    expect(stepNumber(s)).toBe(1);
    expect(toNewBottle(s)).toBeNull();
  });

  it('goes Model, then Size, then Colorway as each is chosen', () => {
    expect(run({ type: 'chooseModel', modelId: 'freesip' }).step).toBe('size');
    const s = run({ type: 'chooseModel', modelId: 'freesip' }, { type: 'chooseSize', sizeOz: 24 });
    expect(s.step).toBe('colorway');
    expect(stepNumber(s)).toBe(3);
  });

  it('needs a Colorway before it can continue to the nickname', () => {
    const atColorway = run({ type: 'chooseModel', modelId: 'freesip' }, { type: 'chooseSize', sizeOz: 24 });
    expect(canContinue(atColorway)).toBe(false);
    expect(registerReducer(atColorway, { type: 'next' }).step).toBe('colorway');

    const picked = registerReducer(atColorway, { type: 'chooseColorway', colorwayId: 'read-my-lips' });
    expect(canContinue(picked)).toBe(true);
    const atNickname = registerReducer(picked, { type: 'next' });
    expect(atNickname.step).toBe('nickname');
    expect(stepNumber(atNickname)).toBe(4);
  });

  it('builds the Bottle from a Catalog colorway, with the nickname trimmed and left out when blank', () => {
    const base = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'chooseColorway', colorwayId: 'read-my-lips' },
      { type: 'next' },
    );
    expect(toNewBottle(base)).toEqual({
      modelId: 'freesip',
      sizeOz: 24,
      colorway: { kind: 'catalog', colorwayId: 'read-my-lips' },
    });
    const named = registerReducer(base, { type: 'setNickname', nickname: '  Desk bottle ' });
    expect(toNewBottle(named)).toEqual({
      modelId: 'freesip',
      sizeOz: 24,
      nickname: 'Desk bottle',
      colorway: { kind: 'catalog', colorwayId: 'read-my-lips' },
    });
  });

  it('going back keeps what was chosen; Back on the first step stays there', () => {
    const s = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'chooseColorway', colorwayId: 'read-my-lips' },
      { type: 'back' },
    );
    expect(s.step).toBe('size');
    expect(s.modelId).toBe('freesip');
    expect(s.sizeOz).toBe(24);
    expect(s.colorwayId).toBe('read-my-lips');
    expect(run({ type: 'back' }).step).toBe('model');
  });

  it('choosing a different Model clears the Size and Colorway; choosing the same one keeps them', () => {
    const picked = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'chooseColorway', colorwayId: 'read-my-lips' },
    );
    const same = registerReducer(picked, { type: 'chooseModel', modelId: 'freesip' });
    expect(same.sizeOz).toBe(24);
    expect(same.colorwayId).toBe('read-my-lips');
    const other = registerReducer(picked, { type: 'chooseModel', modelId: 'smoothsip' });
    expect(other.sizeOz).toBeNull();
    expect(other.colorwayId).toBeNull();
    expect(other.step).toBe('size');
  });

  it('choosing a different Size clears the Colorway, since each size has its own list', () => {
    const picked = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'chooseColorway', colorwayId: 'read-my-lips' },
    );
    expect(registerReducer(picked, { type: 'chooseSize', sizeOz: 32 }).colorwayId).toBeNull();
  });
});

describe('a Custom colorway', () => {
  const atColorway = run({ type: 'chooseModel', modelId: 'freesip' }, { type: 'chooseSize', sizeOz: 24 });

  it('opens its own step, pre-filled with what was typed in the search', () => {
    const s = registerReducer(atColorway, { type: 'startCustom', name: 'Grandma blue' });
    expect(s.step).toBe('custom');
    expect(s.custom.name).toBe('Grandma blue');
    expect(stepNumber(s)).toBe(3);
  });

  it('needs a name before it can continue', () => {
    const s = registerReducer(atColorway, { type: 'startCustom', name: '' });
    expect(canContinue(s)).toBe(false);
    expect(canContinue(registerReducer(s, { type: 'editCustom', patch: { name: '   ' } }))).toBe(false);
    expect(canContinue(registerReducer(s, { type: 'editCustom', patch: { name: 'Grandma blue' } }))).toBe(true);
  });

  it('builds a Bottle with the name and its own Palette', () => {
    const s = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'startCustom', name: ' Grandma blue ' },
      { type: 'editCustom', patch: { body: '#112233', lid: '#445566', accent: '#778899' } },
      { type: 'next' },
    );
    expect(s.step).toBe('nickname');
    expect(toNewBottle(s)).toEqual({
      modelId: 'freesip',
      sizeOz: 24,
      colorway: { kind: 'custom', name: 'Grandma blue', palette: { body: '#112233', lid: '#445566', accent: '#778899' } },
    });
  });

  it('Back from the nickname returns to the custom step, and from there to the Colorway list', () => {
    const atNickname = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'startCustom', name: 'Grandma blue' },
      { type: 'next' },
    );
    const back1 = registerReducer(atNickname, { type: 'back' });
    expect(back1.step).toBe('custom');
    expect(registerReducer(back1, { type: 'back' }).step).toBe('colorway');
  });

  it('picking a Catalog colorway instead drops the custom choice', () => {
    const s = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'startCustom', name: 'Grandma blue' },
      { type: 'back' },
      { type: 'chooseColorway', colorwayId: 'read-my-lips' },
      { type: 'next' },
    );
    expect(toNewBottle(s)?.colorway).toEqual({ kind: 'catalog', colorwayId: 'read-my-lips' });
  });
});

describe('colors set by hand on a Catalog colorway', () => {
  it('are saved as Overrides, only for the slots that were set', () => {
    const s = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'chooseColorway', colorwayId: 'antique-charm' },
      { type: 'next' },
      { type: 'setColor', slot: 'body', hex: '#aa5500' },
    );
    expect(toNewBottle(s)?.overrides).toEqual({ body: '#aa5500' });
  });

  it('are forgotten when a different Colorway is chosen', () => {
    const s = run(
      { type: 'chooseModel', modelId: 'freesip' },
      { type: 'chooseSize', sizeOz: 24 },
      { type: 'chooseColorway', colorwayId: 'antique-charm' },
      { type: 'setColor', slot: 'body', hex: '#aa5500' },
      { type: 'chooseColorway', colorwayId: 'read-my-lips' },
    );
    expect(toNewBottle(s)).not.toHaveProperty('overrides');
  });
});
