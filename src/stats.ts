/** One region with players searching in it. */
export interface IRegion {
	readonly group: number
	readonly name: string
	readonly count: number
}

/**
 * The searching players the game coordinator last reported, by match group. Groups read from the
 * game's `matchgroups.txt` once, on the first report.
 */
export class SearchStats {
	public Received = false
	/** Bumped on every report, so a reader knows when to count again. */
	public Version = 0
	private counts: readonly number[] = []
	private names: Nullable<Map<number, string>>

	public Update(msg: RecursiveMap): void {
		this.counts = readCounts(msg)
		this.names ??= readGroups()
		this.Received = true
		this.Version++
	}

	/**
	 * The regions in `mask` with anyone searching, most crowded first, written into `out`.
	 * Answers how many players they hold together.
	 */
	public Collect(mask: number, out: IRegion[]): number {
		out.length = 0
		let total = 0
		const names = this.names
		if (names === undefined) {
			return total
		}
		for (const [group, name] of names) {
			const count = this.counts[group] ?? 0
			if (count === 0 || (mask & (1 << group)) === 0) {
				continue
			}
			out.push({ group, name, count })
			total += count
		}
		out.sort((a, b) => b.count - a.count)
		return total
	}
}

/** Players searching by match group; the legacy list stands in when the report has no groups. */
function readCounts(msg: RecursiveMap): number[] {
	const groups = msg.get("match_groups") as Nullable<RecursiveMap[]>
	if (groups !== undefined && groups.length !== 0) {
		return groups.map(
			group => (group.get("players_searching") as Nullable<number>) ?? 0
		)
	}
	const legacy = msg.get("legacy_searching_players_by_group_source2")
	return (legacy as Nullable<number[]>) ?? []
}

function readGroups(): Map<number, string> {
	const groups = parseKV("scripts/matchgroups.txt").get(
		"matchgroups"
	) as Nullable<RecursiveMap>
	const names = new Map<number, string>()
	if (groups === undefined) {
		return names
	}
	for (const group of groups.values()) {
		if (!(group instanceof Map)) {
			continue
		}
		const id = parseInt(group.get("group") as string)
		const name = group.get("display_name") as Nullable<string>
		if (!Number.isNaN(id) && name !== undefined) {
			names.set(id, name.startsWith("#") ? name.slice(1) : name)
		}
	}
	return names
}
