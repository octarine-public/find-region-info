/**
 * The panel's own colours, the ones the MMR tracker reads in, so the two cards on the dashboard
 * look like one set.
 */
const Base = {
	title: new Color(232, 232, 238),
	muted: new Color(138, 138, 150),
	faint: new Color(93, 93, 104),
	icon: new Color(167, 139, 250)
}

const Keys = Object.keys(Base) as (keyof typeof Base)[]

/** {@link Base} relit for the theme in use, so a light theme still reads them. */
export const Palette = { ...Base }

/** Relights the palette for the theme in use; once a frame, before anything is drawn with it. */
export function RefreshPalette(): void {
	const readable = MenuSDK.HudColors.readable
	for (const key of Keys) {
		Palette[key] = readable(Base[key])
	}
}
