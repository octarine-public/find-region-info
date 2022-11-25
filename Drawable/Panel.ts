import { FlagText, RectangleX } from "github.com/octarine-private/immortal-core/index"
import {
	Color,
	GUIInfo,
	Input,
	Menu,
	Vector2,
	VMouseKeys
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "../Manager/Menu"

export interface IMenu {
	PositionX: number
	PositionY: number
	ShowRegion: boolean
	OpacityHeader: number
	OpacityRegion: number
}

export class WindowPanel {
	public static OnWindowSizeChanged(): void {
		this.HeaderSize.x = GUIInfo.ScaleWidth(250)
		this.HeaderSize.y = GUIInfo.ScaleHeight(35)
	}

	private static HeaderPosition = new Vector2()
	private static readonly HeaderSize = new Vector2()

	private static readonly basePath = "github.com/octarine-public/find-region-info/"
	private static readonly header = this.basePath + "scripts_files/header.svg"
	private static readonly arrowActivePath = this.basePath + "scripts_files/arrow_active.svg"
	private static readonly arrowInactivePath = this.basePath + "scripts_files/arrow_inactive.svg"

	private TotalPlayers = 0
	private DirtyPosition = false
	private MouseOnPanel = new Vector2()

	private TextColorHeader = Color.White
	private TextColorRegion = Color.White
	private ImageColorHeader = Color.White
	private backgroundColor = new Color(23, 22, 39)

	constructor(protected menu: MenuManager) {
		this.menu.OnMenuChange(() => this.OnMenuChanged(menu.IMenu))
	}

	public get HeaderPosition() {
		return new RectangleX(WindowPanel.HeaderPosition, WindowPanel.HeaderSize)
	}

	public OnDraw(players: Map<number, string>, regions: number[]) {
		const baseHeader = this.HeaderPosition

		if (!baseHeader.IsZero()) {
			this.Header(baseHeader)
			this.Players(baseHeader, players, regions)
		}

		if (baseHeader.IsZero()) return

		if (this.DirtyPosition) {
			const mousePos = Input.CursorOnScreen
			baseHeader.pos1.CopyFrom(mousePos.Subtract(this.MouseOnPanel))
			this.menu.Position.Vector = baseHeader.pos1
				.Clone()
				.DivideScalarX(GUIInfo.GetWidthScale())
				.DivideScalarY(GUIInfo.GetHeightScale())
				.RoundForThis(1)
		}
	}

	public OnMenuChanged(menu: IMenu) {
		const headerOpacity = (menu.OpacityHeader / 100) * 255
		const regionOpacity = (menu.OpacityRegion / 100) * 255

		this.TextColorHeader.SetA(headerOpacity)
		this.TextColorRegion.SetA(regionOpacity)
		this.backgroundColor.SetA(regionOpacity)
		this.ImageColorHeader.SetA(headerOpacity)

		WindowPanel.HeaderPosition.CopyFrom(
			new Vector2(GUIInfo.ScaleWidth(menu.PositionX), GUIInfo.ScaleHeight(menu.PositionY))
		)
	}

	public OnMouseKeyUp(key: VMouseKeys) {
		if (key !== VMouseKeys.MK_LBUTTON) return true
		this.DirtyPosition = false
		Menu.Base.SaveConfigASAP = true
		this.menu.Position.Vector = this.HeaderPosition.pos1
			.Clone()
			.DivideScalarX(GUIInfo.GetWidthScale())
			.DivideScalarY(GUIInfo.GetHeightScale())
			.RoundForThis(1)
		return true
	}

	public OnMouseKeyDown(key: VMouseKeys) {
		if (key !== VMouseKeys.MK_LBUTTON || this.HeaderPosition.IsZero()) return true

		const baseHeader = this.HeaderPosition
		const header = baseHeader.Clone().SubtractSize(10)

		const arrowSize = new Vector2(GUIInfo.ScaleWidth(32), header.Height)
		const arrowPos = header.pos1.Clone().AddScalarX(header.Width - arrowSize.x)
		const arrowPosition = new RectangleX(arrowPos, arrowSize)

		if (
			Input.CursorOnScreen.IsUnderRectangle(
				arrowPosition.x,
				arrowPosition.y,
				arrowPosition.Width,
				arrowPosition.Height
			)
		) {
			this.menu.ShowRegion.value = !this.menu.ShowRegion.value
			return false
		}

		if (!Input.CursorOnScreen.IsUnderRectangle(header.x, header.y, header.Width, header.Height))
			return true

		this.DirtyPosition = true
		this.MouseOnPanel.CopyFrom(Input.CursorOnScreen.Subtract(header.pos1))
		return false
	}

	protected Players(baseHeader: RectangleX, players: Map<number, string>, regions: number[]) {
		let TotalPlayers = 0
		const position = baseHeader.pos1.Clone()
		const background = new RectangleX(position, baseHeader.pos2)

		for (const [key, displayName] of players) {
			const playerCount = regions[key] ?? 0
			if (playerCount === 0) continue

			if (this.menu.ShowRegion.value) {
				const localizedName = displayName.startsWith("#")
					? Menu.Localization.Localize(displayName.slice(1))
					: displayName
				background.pos1.AddScalarY(background.Height)
				RectangleX.FilledRect(background, this.backgroundColor)

				const textPosition = background.Clone().SubtractSize(10)

				RectangleX.Text(
					`${localizedName}: ${this.TextPlayers(playerCount)}`,
					textPosition,
					this.TextColorRegion,
					2,
					FlagText.LEFT_CENTER
				)
			}

			TotalPlayers += playerCount
		}

		this.TotalPlayers = TotalPlayers
	}

	protected Header(baseHeader: RectangleX) {
		RectangleX.Image(WindowPanel.header, baseHeader, this.ImageColorHeader)
		const header = baseHeader.Clone().SubtractSize(10)

		this.HeaderText(header)

		const arrowSize = new Vector2(GUIInfo.ScaleWidth(32), header.Height)
		const arrowPos = header.pos1.Clone().AddScalarX(header.Width - arrowSize.x)
		const arrowPosition = new RectangleX(arrowPos, arrowSize)

		RectangleX.Image(
			!this.menu.ShowRegion.value
				? WindowPanel.arrowInactivePath
				: WindowPanel.arrowActivePath,
			arrowPosition,
			this.ImageColorHeader
		)
	}

	protected HeaderText(HeaderPositon: RectangleX) {
		const textSearch = RectangleX.Text(
			Menu.Localization.Localize("Total in search") + ":",
			HeaderPositon,
			this.TextColorHeader,
			2,
			FlagText.LEFT_CENTER
		)

		const gap = GUIInfo.ScaleWidth(3)
		const textPosition = HeaderPositon.Clone()

		textPosition.pos1.AddScalarX(textSearch.Width + gap)
		textPosition.pos2.SubtractScalarX(textSearch.Width)

		RectangleX.Text(
			this.TextPlayers(this.TotalPlayers),
			textPosition,
			this.TextColorHeader,
			2,
			FlagText.LEFT_CENTER
		)
	}

	protected TextPlayers(count: number) {
		return (
			count +
			" " +
			this.NumberDeclension(count, [
				Menu.Localization.Localize("player"),
				Menu.Localization.Localize("players"),
				Menu.Localization.Localize("players_x")
			])
		)
	}

	private NumberDeclension(num: number, names: string[]): string {
		const cases = [2, 0, 1, 1, 1, 2]
		return names[num % 100 > 4 && num % 100 < 20 ? 2 : cases[num % 10 < 5 ? num % 10 : 5]]
	}
}
