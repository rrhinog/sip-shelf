import type { HexColor, NewBottle, Overrides, PaletteSlot } from '../../domain/types';

export type Step = 'model' | 'size' | 'colorway' | 'custom' | 'nickname';

/** What a person types in when their colorway is not in the Catalog. */
export interface CustomDraft {
  name: string;
  body: HexColor;
  lid: HexColor;
  accent: HexColor;
}

export interface RegisterState {
  step: Step;
  modelId: string | null;
  sizeOz: number | null;
  /** The chosen Catalog colorway, when the person is not making a Custom one. */
  colorwayId: string | null;
  /** True once the person chose "My colorway isn't listed" (and has not picked a Catalog colorway since). */
  isCustom: boolean;
  custom: CustomDraft;
  /** Colors set by hand on a Catalog colorway (offered for ones whose colors were not sampled). */
  overrides: Overrides;
  nickname: string;
}

export type RegisterAction =
  | { type: 'chooseModel'; modelId: string }
  | { type: 'chooseSize'; sizeOz: number }
  | { type: 'chooseColorway'; colorwayId: string }
  | { type: 'startCustom'; name: string }
  | { type: 'editCustom'; patch: Partial<CustomDraft> }
  | { type: 'setColor'; slot: PaletteSlot; hex: HexColor }
  | { type: 'setNickname'; nickname: string }
  | { type: 'next' }
  | { type: 'back' };

/** Starting colors of a new Custom colorway; the person changes them. */
export const CUSTOM_DEFAULTS: Omit<CustomDraft, 'name'> = { body: '#4a6572', lid: '#dbe4e8', accent: '#e07a5f' };

export function initialRegisterState(): RegisterState {
  return {
    step: 'model',
    modelId: null,
    sizeOz: null,
    colorwayId: null,
    isCustom: false,
    custom: { name: '', ...CUSTOM_DEFAULTS },
    overrides: {},
    nickname: '',
  };
}

/** The step number shown to the person, 1 to 4 (a Custom colorway is still step 3). */
export function stepNumber(state: RegisterState): 1 | 2 | 3 | 4 {
  switch (state.step) {
    case 'model':
      return 1;
    case 'size':
      return 2;
    case 'colorway':
    case 'custom':
      return 3;
    case 'nickname':
      return 4;
  }
}

/** Whether the "Next" button of the Colorway or Custom step may be used. */
export function canContinue(state: RegisterState): boolean {
  if (state.step === 'custom') return state.custom.name.trim() !== '';
  if (state.step === 'colorway') return state.colorwayId !== null || state.isCustom;
  return true;
}

export function registerReducer(state: RegisterState, action: RegisterAction): RegisterState {
  switch (action.type) {
    case 'chooseModel': {
      const changed = action.modelId !== state.modelId;
      return {
        ...state,
        step: 'size',
        modelId: action.modelId,
        ...(changed ? { sizeOz: null, colorwayId: null, isCustom: false, overrides: {} } : {}),
      };
    }
    case 'chooseSize': {
      const changed = action.sizeOz !== state.sizeOz;
      return {
        ...state,
        step: 'colorway',
        sizeOz: action.sizeOz,
        ...(changed ? { colorwayId: null, isCustom: false, overrides: {} } : {}),
      };
    }
    case 'chooseColorway':
      return {
        ...state,
        colorwayId: action.colorwayId,
        isCustom: false,
        overrides: action.colorwayId === state.colorwayId ? state.overrides : {},
      };
    case 'startCustom':
      return { ...state, step: 'custom', isCustom: true, colorwayId: null, overrides: {}, custom: { ...state.custom, name: action.name } };
    case 'editCustom':
      return { ...state, custom: { ...state.custom, ...action.patch } };
    case 'setColor':
      return { ...state, overrides: { ...state.overrides, [action.slot]: action.hex } };
    case 'setNickname':
      return { ...state, nickname: action.nickname };
    case 'next':
      if ((state.step === 'colorway' || state.step === 'custom') && canContinue(state)) return { ...state, step: 'nickname' };
      return state;
    case 'back':
      switch (state.step) {
        case 'model':
          return state;
        case 'size':
          return { ...state, step: 'model' };
        case 'colorway':
          return { ...state, step: 'size' };
        case 'custom':
          return { ...state, step: 'colorway' };
        case 'nickname':
          return { ...state, step: state.isCustom ? 'custom' : 'colorway' };
      }
  }
}

/** The Bottle to add to the Shelf, or null while Model, Size or Colorway is still missing. */
export function toNewBottle(state: RegisterState): NewBottle | null {
  const { modelId, sizeOz } = state;
  if (modelId === null || sizeOz === null) return null;
  const nickname = state.nickname.trim();
  const extras = nickname ? { nickname } : {};
  if (state.isCustom) {
    const name = state.custom.name.trim();
    if (!name) return null;
    const { body, lid, accent } = state.custom;
    return { modelId, sizeOz, ...extras, colorway: { kind: 'custom', name, palette: { body, lid, accent } } };
  }
  if (state.colorwayId === null) return null;
  const overrides = Object.keys(state.overrides).length > 0 ? { overrides: state.overrides } : {};
  return { modelId, sizeOz, ...extras, colorway: { kind: 'catalog', colorwayId: state.colorwayId }, ...overrides };
}
