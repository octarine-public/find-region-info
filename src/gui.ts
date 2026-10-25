import { MenuManager } from "./menu"
import { Palette, RefreshPalette } from "./palette"
import { Paths } from "./paths"
import { IRegion, SearchStats } from "./stats"

const HEADER_HEIGHT = 34
const ICON = 18
const TOTAL_FONT = 14
const TOTAL_RESERVE = "000 000"
const UNIT_FONT = 11
const UNIT_GAP = 4
/** The arrow at the header's right end that opens the regions, and the gap before it. */
const CHEVRON = 14
const CHEVRON_GAP = 12
/** The line over the rows naming them, with how many there are at its right. */
const SECTION_HEIGHT = 26
const ROW_HEIGHT = 30
const EMPTY_HEIGHT = 28
const BODY_BOTTOM = 6
const BODY_MIN_WIDTH = 220
const NAME_FONT = 12
const NAME_WEIGHT = 500
const NAME_MAX = 170
const COUNT_FONT = 12
const SUB_FONT = 11
const TEXT_GAP = 12
/** How far a row's line stands above its middle, and the bar under it below. */
const LINE_OFFSET = 4
const BAR_OFFSET = 8
const BAR_HEIGHT = 3
const BAR_TRACK = 40
const FOLD_MS = MenuSDK.Duration.Reveal

/** One region as the panel writes it, worded again only when the counts or the language move on. */
interface IRow {
	name: string
	count: string
	share: number
}

/**
 * The menu's place as the panel sees it. The menu keeps where the total stands; the panel is told
 * where its top edge is, which regions opened upward lift above that line, so the total stays put
 * while the regions unfold over it and a drag still stores the line's place.
 */
class HeaderAnchor implements MenuSDK.IOverlayMenu {
	/** How far, in px, the card's top stands above the total this frame. */
	public Lift = 0
	public readonly SetupEntry: MenuSDK.Entry
	private readonly stored = new Vector2()

	constructor(private readonly overlay: MenuSDK.OverlayMenu) {
		this.SetupEntry = overlay.SetupEntry
	}

	public get Scale(): number {
		return this.overlay.Scale
	}

	public get Position(): Vector2 {
		const position = this.overlay.Position
		position.y -= this.Lift
		return position
	}

	/** Given in layout units, the way the panel stores a drag. */
	public set Position(position: Vector2) {
		this.stored.SetVector(position.x, position.y + MenuSDK.ToLayoutUnits(this.Lift))
		this.overlay.Position = this.stored
	}
}

/** What a frame of the panel is built from, so a frame built from the same can be held instead. */
class FrameStamp {
	private readonly values: unknown[] = []
	private index = 0
	private same = true

	public get Same() {
		return this.same
	}
	public Begin() {
		this.index = 0
		this.same = true
	}
	public Put(value: unknown) {
		if (this.values[this.index] !== value) {
			this.values[this.index] = value
			this.same = false
		}
		this.index++
	}
	/** Lets go of the last frame, so the next one is drawn whatever it is built from. */
	public Forget() {
		this.values.length = 0
	}
}

export class GUIHelper {
	private pressed = false
	/** Whether the regions unfold above the total this frame. */
	private opensUp = false
	/** Where the fold was last sent, or nothing before the config has said where it stands. */
	private foldTarget: Nullable<number>

	private rowCount = 0
	private rowsVersion = -1
	private rowsMask = 0
	private rowsLanguage = -1
	/** Counts every time the rows and the total are worded again. */
	private rowsEpoch = 0
	private total = ""
	private unit = ""
	private title = ""
	private regions = ""
	private empty = ""
	private readonly rows: IRow[] = []
	private readonly collected: IRegion[] = []
	/**
	 * The regions' measured text, kept until the rows are worded again or the size, family or
	 * weight they are measured in moves; retried each frame while the host cannot measure.
	 */
	private widthsDirty = true
	private unmeasured = false
	private measuredFamily = ""
	private measuredName = -1
	private measuredCount = -1
	private nameWidth = 0
	private countWidth = 0
	private titleWidth = 0
	private regionsWidth = 0
	private emptyWidth = 0

	private readonly size = new Vector2()
	private readonly box = new Rectangle()
	private readonly chevron = new Rectangle()
	private readonly iconPos = new Vector2()
	private readonly iconSize = new Vector2()
	private readonly anchor: HeaderAnchor
	private readonly panel: MenuSDK.OverlayPanel
	/** How far the regions stand open, 0 to 1: read at draw time, the tween only carries it. */
	private readonly fold = new MenuSDK.Tween(
		0,
		() => undefined,
		MenuSDK.EThemeScope.Panels
	)
	private readonly stamp = new FrameStamp()

	private readonly icon = `${Paths.Images}/players.svg`
	private readonly arrow = `${Paths.Images}/chevron-down.svg`

	private readonly drawContent = (origin: Vector2) => {
		const box = this.box
		box.pos1.CopyFrom(origin)
		box.pos2.SetVector(origin.x + this.size.x, origin.y + this.size.y)
		MenuSDK.HudCard.Frame(box)

		const height = MenuSDK.hudH(HEADER_HEIGHT)
		const top = this.opensUp ? box.pos2.y - height : box.y
		this.drawHeader(box, top, height)
		const presence = this.fold.Value
		if (presence <= 0) {
			return
		}
		const alpha = MenuSDK.HudAlphaScale()
		MenuSDK.SetHudAlphaScale(alpha * presence)
		this.drawRegions(box, top, top + height)
		MenuSDK.SetHudAlphaScale(alpha)
	}

	constructor(
		private readonly menu: MenuManager,
		private readonly stats: SearchStats
	) {
		this.anchor = new HeaderAnchor(menu.Overlay)
		this.panel = new MenuSDK.OverlayPanel(
			this.anchor,
			"hud-find-region-info",
			MenuSDK.EPanelLife.Always
		)
		MenuSDK.OnMetricsChanged(() => this.stamp.Forget())
	}

	/**
	 * Shut, the card is as wide as its header; it widens to the regions together with the fold.
	 * Opened upward, the card grows over the total instead of under it.
	 */
	public Draw(): void {
		if (!this.menu.IsToggled || (!this.stats.Received && !this.menu.IsOpen)) {
			this.Reset()
			return
		}
		MenuSDK.setHudScale(this.panel.Scale)
		RefreshPalette()
		this.refreshRows()
		const presence = this.presence()
		if (this.fold.Running) {
			// the card is drawn in the retained pass, whose rate would step the fold visibly
			Source2SDK.InvalidateDraw2D()
		}
		const header = this.headerWidth()
		const width = header + Math.max(0, this.regionsBodyWidth() - header) * presence
		const line = MenuSDK.hudH(HEADER_HEIGHT)
		this.size.SetVector(
			Math.round(width),
			Math.round(line + this.regionsHeight() * presence)
		)
		this.opensUp = this.menu.OpensUp
		this.anchor.Lift = this.opensUp ? this.size.y - line : 0
		if (this.restamp() && this.panel.Hold(this.size)) {
			return
		}
		this.panel.Draw(this.size, this.drawContent)
	}

	/** A press on the arrow is the arrow's; anywhere else on the card it carries the card. */
	public MouseKeyDown(key: VMouseKeys): boolean {
		if (key === VMouseKeys.MK_LBUTTON && this.overChevron()) {
			this.pressed = true
			return false
		}
		return this.panel.MouseKeyDown(key)
	}

	public MouseKeyUp(key: VMouseKeys): boolean {
		if (key !== VMouseKeys.MK_LBUTTON) {
			return true
		}
		if (!this.pressed) {
			return this.panel.MouseKeyUp()
		}
		this.pressed = false
		if (this.overChevron()) {
			this.menu.Expanded.value = !this.menu.Expanded.value
			Source2SDK.InvalidateDraw2D()
		}
		return false
	}

	public Reset(): void {
		this.pressed = false
		this.chevron.pos1.SetVector(0, 0)
		this.chevron.pos2.SetVector(0, 0)
		this.panel.Reset()
	}

	/**
	 * How far the regions stand open this frame. The menu row says where they belong; the first
	 * reading after a load lands there at once, every later change eases over.
	 */
	private presence(): number {
		const target = this.menu.Expanded.value ? 1 : 0
		if (target !== this.foldTarget) {
			if (this.foldTarget === undefined) {
				this.fold.Set(target)
			} else {
				this.fold.To(target, FOLD_MS, MenuSDK.Ease.Out)
			}
			this.foldTarget = target
		}
		return this.fold.Value
	}

	/**
	 * Writes what this frame is built from and answers whether the last frame was built from the
	 * same. A frame whose text the host could not measure yet is never the same.
	 */
	private restamp(): boolean {
		const stamp = this.stamp,
			theme = MenuSDK.Theme
		stamp.Begin()
		stamp.Put(this.rowsEpoch)
		stamp.Put(this.opensUp)
		stamp.Put(this.fold.Value)
		stamp.Put(this.size.x)
		stamp.Put(this.size.y)
		stamp.Put(this.overChevron())
		stamp.Put(this.panel.Scale)
		stamp.Put(MenuSDK.DpToPx(1))
		stamp.Put(theme.PaletteEpoch)
		stamp.Put(theme.Glow)
		stamp.Put(MenuSDK.FontEpoch())
		stamp.Put(Menu.Localization.Version)
		return stamp.Same && !this.widthsDirty
	}

	private headerWidth(): number {
		const pad = MenuSDK.hudW(MenuSDK.HudCard.Pad)
		return (
			pad +
			MenuSDK.hudW(ICON + MenuSDK.HudHeaderGap) +
			Math.max(
				MenuSDK.HudText.Width(this.total, TOTAL_FONT, MenuSDK.HudBold),
				this.totalReserve()
			) +
			MenuSDK.hudW(UNIT_GAP) +
			MenuSDK.HudText.Width(this.unit, UNIT_FONT, MenuSDK.HudBold) +
			MenuSDK.hudW(CHEVRON_GAP + CHEVRON + MenuSDK.HudCard.Pad)
		)
	}

	/** The room the total is held to, so the line does not breathe as the count moves. */
	private totalReserve(): number {
		return MenuSDK.HudText.Width(TOTAL_RESERVE, TOTAL_FONT, MenuSDK.HudBold)
	}

	/** Wide enough for the longest name beside the widest count; with no regions, the line saying so. */
	private regionsBodyWidth(): number {
		this.measureRegions()
		const pad = MenuSDK.hudW(MenuSDK.HudCard.Pad)
		const gap = MenuSDK.hudW(TEXT_GAP)
		if (this.rowCount === 0) {
			return pad * 2 + Math.max(this.titleWidth, this.emptyWidth)
		}
		const rows =
			pad * 2 +
			Math.min(this.nameWidth, MenuSDK.hudW(NAME_MAX)) +
			gap +
			this.countWidth
		const section = pad * 2 + this.titleWidth + gap + this.regionsWidth
		return Math.max(MenuSDK.hudW(BODY_MIN_WIDTH), rows, section)
	}

	private measureRegions(): void {
		const family = MenuSDK.Theme.FontFamily
		const name = MenuSDK.hudFont(NAME_FONT)
		const count = MenuSDK.hudFont(COUNT_FONT)
		if (
			!this.widthsDirty &&
			family === this.measuredFamily &&
			name === this.measuredName &&
			count === this.measuredCount
		) {
			return
		}
		this.measuredFamily = family
		this.measuredName = name
		this.measuredCount = count
		this.unmeasured = false

		let names = 0
		let counts = 0
		for (let i = 0; i < this.rowCount; i++) {
			const row = this.rows[i]
			names = Math.max(names, this.measure(row.name, NAME_FONT, NAME_WEIGHT))
			counts = Math.max(
				counts,
				this.measure(row.count, COUNT_FONT, MenuSDK.HudBold)
			)
		}
		this.nameWidth = names
		this.countWidth = counts
		this.titleWidth = this.measure(this.title, SUB_FONT, MenuSDK.HudBold)
		this.regionsWidth = this.measure(this.regions, SUB_FONT, MenuSDK.HudBold)
		this.emptyWidth = this.measure(this.empty, SUB_FONT, NAME_WEIGHT)
		this.widthsDirty = this.unmeasured
	}

	/** A run's width, noting when the host could not measure it yet so the next frame asks again. */
	private measure(text: string, size: number, weight: number): number {
		const width = MenuSDK.HudText.Width(text, size, weight)
		if (width === 0 && text !== "") {
			this.unmeasured = true
		}
		return width
	}

	private regionsHeight(): number {
		const rows =
			this.rowCount === 0
				? MenuSDK.hudH(EMPTY_HEIGHT)
				: MenuSDK.hudH(ROW_HEIGHT) * this.rowCount
		return MenuSDK.hudH(SECTION_HEIGHT) + rows + MenuSDK.hudH(BODY_BOTTOM)
	}

	/**
	 * The total with the arrow at its right end, `height` tall from `top`. The arrow points the
	 * way the regions would go, and back once they are open.
	 */
	private drawHeader(box: Rectangle, top: number, height: number): void {
		const pad = MenuSDK.hudW(MenuSDK.HudCard.Pad)
		const centerY = top + height / 2
		const icon = MenuSDK.hudW(ICON)
		this.iconPos.SetVector(box.x + pad, centerY - icon / 2)
		this.iconSize.SetVector(icon, icon)
		MenuSDK.HudCard.Image(
			this.icon,
			this.iconPos,
			this.iconSize,
			Palette.icon,
			MenuSDK.hudAlpha()
		)
		let x = box.x + pad + icon + MenuSDK.hudW(MenuSDK.HudHeaderGap)
		x += Math.max(
			MenuSDK.HudText.Left(
				x,
				centerY,
				this.total,
				TOTAL_FONT,
				Palette.title,
				MenuSDK.HudBold
			),
			this.totalReserve()
		)
		MenuSDK.HudText.Left(
			x + MenuSDK.hudW(UNIT_GAP),
			centerY,
			this.unit,
			UNIT_FONT,
			Palette.muted,
			MenuSDK.HudBold
		)

		const chevron = MenuSDK.hudW(CHEVRON)
		const right = box.pos2.x
		this.chevron.pos1.SetVector(right - chevron - pad * 2, top)
		this.chevron.pos2.SetVector(right, top + height)
		this.iconPos.SetVector(right - pad - chevron, centerY - chevron / 2)
		this.iconSize.SetVector(chevron, chevron)
		MenuSDK.HudCard.Image(
			this.arrow,
			this.iconPos,
			this.iconSize,
			this.overChevron() ? Palette.icon : Palette.muted,
			MenuSDK.hudAlpha(),
			0,
			180 * (this.opensUp ? 1 - this.fold.Value : this.fold.Value)
		)
	}

	/**
	 * The regions beside the header, cut to the room the card has opened to: a line stands only
	 * once the card has room for all of it, so the list fills in as the card grows. Opened upward,
	 * the list is laid out to end on the header's top edge and is revealed from there.
	 */
	private drawRegions(box: Rectangle, headerTop: number, headerBottom: number): void {
		const pad = MenuSDK.hudW(MenuSDK.HudCard.Pad)
		const left = box.x + pad
		const right = box.pos2.x - pad
		const up = this.opensUp
		const ceiling = up ? box.y : headerBottom
		const floor = up ? headerTop : box.pos2.y
		const top = up
			? headerTop - this.regionsHeight() + MenuSDK.hudH(BODY_BOTTOM)
			: headerBottom
		MenuSDK.HudCard.Separator(left, up ? headerTop : headerBottom, right - left)

		const section = MenuSDK.hudH(SECTION_HEIGHT)
		const sectionY = top + section / 2
		const titled = top >= ceiling
		if (titled) {
			MenuSDK.HudText.Left(
				left,
				sectionY,
				this.title,
				SUB_FONT,
				Palette.muted,
				MenuSDK.HudBold
			)
		}
		let y = top + section
		if (this.rowCount === 0) {
			const line = MenuSDK.hudH(EMPTY_HEIGHT)
			if (y >= ceiling && y + line <= floor) {
				MenuSDK.HudText.Left(
					left,
					y + line / 2,
					this.empty,
					SUB_FONT,
					Palette.faint,
					NAME_WEIGHT
				)
			}
			return
		}
		if (titled) {
			MenuSDK.HudText.Right(
				right,
				sectionY,
				this.regions,
				SUB_FONT,
				Palette.faint,
				MenuSDK.HudBold
			)
		}
		const height = MenuSDK.hudH(ROW_HEIGHT)
		for (let i = 0; i < this.rowCount && y + height <= floor; i++, y += height) {
			if (y >= ceiling) {
				this.drawRow(this.rows[i], left, right, y + height / 2)
			}
		}
	}

	/** A region's name and count, with a bar under them as long as its share of the busiest. */
	private drawRow(row: IRow, left: number, right: number, centerY: number): void {
		const lineY = centerY - MenuSDK.hudH(LINE_OFFSET)
		const countWidth = MenuSDK.HudText.Right(
			right,
			lineY,
			row.count,
			COUNT_FONT,
			Palette.title,
			MenuSDK.HudBold
		)
		const room = right - countWidth - MenuSDK.hudW(TEXT_GAP) - left
		MenuSDK.HudText.Left(
			left,
			lineY,
			MenuSDK.HudText.Clip(row.name, room, NAME_FONT, NAME_WEIGHT),
			NAME_FONT,
			Palette.title,
			NAME_WEIGHT
		)
		const barH = MenuSDK.hudH(BAR_HEIGHT)
		const barY = centerY + MenuSDK.hudH(BAR_OFFSET) - barH / 2
		const width = right - left
		MenuSDK.HudCard.Plate(
			left,
			barY,
			width,
			barH,
			barH / 2,
			Palette.faint,
			MenuSDK.hudAlpha(BAR_TRACK)
		)
		MenuSDK.HudCard.Plate(
			left,
			barY,
			Math.max(barH, width * row.share),
			barH,
			barH / 2,
			Palette.icon,
			MenuSDK.hudAlpha()
		)
	}

	/** Counts the regions again when a report arrives, the search's regions change or the language does. */
	private refreshRows(): void {
		const version = this.stats.Version
		const mask = this.regionMask()
		const language = Menu.Localization.Version
		if (
			version === this.rowsVersion &&
			mask === this.rowsMask &&
			language === this.rowsLanguage
		) {
			return
		}
		this.rowsVersion = version
		this.rowsMask = mask
		this.rowsLanguage = language
		this.rowsEpoch++
		this.widthsDirty = true

		const regions = this.collected
		const total = this.stats.Collect(mask, regions)
		const busiest = regions.length === 0 ? 1 : regions[0].count
		this.rowCount = regions.length
		for (let i = 0; i < regions.length; i++) {
			const region = regions[i]
			let row = this.rows[i]
			if (row === undefined) {
				row = this.rows[i] = { name: "", count: "", share: 0 }
			}
			row.name = Menu.Localization.Localize(region.name)
			row.count = grouped(region.count)
			row.share = region.count / busiest
		}
		const localize = (name: string) => Menu.Localization.Localize(name)
		this.total = grouped(total)
		this.unit = localize("in search")
		this.title = localize("Regions")
		this.regions = regions.length.toString()
		this.empty = localize("Nobody is searching")
	}

	/**
	 * The match groups the party searches in, or every group when the menu asks for all of them or
	 * the game has none picked.
	 */
	private regionMask(): number {
		if (!this.menu.OnlyParty.value) {
			return ~0
		}
		return (
			ConVarsSDK.GetInt("dota_matchgroups_new", 0) ||
			ConVarsSDK.GetInt("dota_matchgroups_automatic", 0) ||
			~0
		)
	}

	/** Whether the cursor stands on the arrow of the panel that owns it. */
	private overChevron(): boolean {
		return (
			this.panel.HandlesInput() &&
			this.chevron.Contains(InputManager.CursorOnScreen)
		)
	}
}

/** "12 345": the count with its thousands set apart. */
function grouped(value: number): string {
	return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}
