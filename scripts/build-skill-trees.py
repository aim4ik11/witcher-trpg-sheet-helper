#!/usr/bin/env python3
"""Generate packages/game-data/src/data/skill-trees.json from rulebook skill trees."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "packages/game-data/src/data/skill-trees.json"

def ab(name: str, stat: str, description: str) -> dict:
    return {"name": name, "stat": stat, "description": description}

TREES = {
    "Bard": {
        "core": ab(
            "Busking",
            "emp",
            "A Bard can take an hour and make a Busking roll in the nearest town center. "
            "The total is crowns earned while performing. A fumble lowers income; a negative "
            "total means no coin and locals harass the Bard (−2 Charisma in that town for the day).",
        ),
        "paths": [
            {
                "label": "The Charmer",
                "tiers": [
                    ab(
                        "Return Act",
                        "emp",
                        "Before Busking, roll Return Act (GM sets DC) to see if the Bard played here before. "
                        "On success, Busking income doubles and the Bard gains +2 Charisma at that venue.",
                    ),
                    ab(
                        "Raise A Crowd",
                        "emp",
                        "By performing for a full round, roll Raise A Crowd to captivate anyone within 20 m. "
                        "Targets who fail Resist Coercion vs. your roll can only watch until they beat it; "
                        "being attacked snaps them out.",
                    ),
                    ab(
                        "Good Friend",
                        "emp",
                        "Once per session, roll Good Friend to find an ally. Split the roll between Settlement, "
                        "Profession, and Importance (see rulebook chart). The friend does one reasonable favor, "
                        "then must be convinced again.",
                    ),
                ],
            },
            {
                "label": "The Informant",
                "tiers": [
                    ab(
                        "Fade",
                        "int",
                        "Roll Fade vs. multiple targets' Awareness to blend into the background without "
                        "cover—joining conversation, drawing attention elsewhere, etc. Fails if wearing "
                        "flashy clothing.",
                    ),
                    ab(
                        "Spread the Word",
                        "int",
                        "After a successful Deceit roll, roll Spread the Word vs. the target's Resist Coercion. "
                        "On success the target spreads your lie through their settlement or group, granting +2 "
                        "to Deceit when repeating that lie to others.",
                    ),
                    ab(
                        "Acclimatize",
                        "int",
                        "In a settlement, roll Acclimatize (DC by settlement size). On success the Bard passes "
                        "as a local (+2 Charisma & Persuasion with locals, not treated as an outsider).",
                    ),
                ],
            },
            {
                "label": "The Manipulator",
                "tiers": [
                    ab(
                        "Poison The Well",
                        "emp",
                        "Roll vs. target's EMP×3 while influencing people. On success, a pointed comment imposes "
                        "−1 per point above DC to the target's Seduction, Persuasion, Leadership, Intimidation, "
                        "or Charisma rolls.",
                    ),
                    ab(
                        "Needling",
                        "emp",
                        "Roll vs. target's Resist Coercion to goad them with insults until they attack. The target "
                        "takes a penalty to attack and defense equal to half your Needling value for that many rounds.",
                    ),
                    ab(
                        "Et Tu Brute",
                        "emp",
                        "Roll vs. target's WILL×3 to turn them against one ally. On success they treat that ally "
                        "with mistrust for days equal to Et Tu Brute value, until Resist Coercion beats the roll.",
                    ),
                ],
            },
        ],
    },
    "Craftsman": {
        "core": ab(
            "Patch Job",
            "cra",
            "Take a turn and roll Patch Job at DC = item Crafting DC − 3 to keep gear in the fight: restore "
            "broken armor/shield to half SP or a broken weapon to half durability (half damage until properly fixed). "
            "An item can only be patched twice total (second patch brings it to ¼ SP/durability).",
        ),
        "paths": [
            {
                "label": "The Forge Master",
                "tiers": [
                    ab(
                        "Extensive Catalogue",
                        "int",
                        "Memorize extra weapon/armor diagrams in your head. At capacity, roll DC 15 (+1 per 10 "
                        "diagrams memorized) to memorize one more—no hard limit.",
                    ),
                    ab(
                        "Journeyman",
                        "cra",
                        "When crafting, roll Journeyman vs. the item's crafting DC. Success adds +1 DMG or +1 SP "
                        "per 2 points above DC (max +5). Cannot raise further with Luck.",
                    ),
                    ab(
                        "Master Crafting",
                        "cra",
                        "Craft master-grade items. Roll Master Crafting vs. crafting DC to permanently grant armor "
                        "resistance (your choice) or weapons 50% bleeding or −2 Stun.",
                    ),
                ],
            },
            {
                "label": "The Alchemist",
                "tiers": [
                    ab(
                        "Mental Pharmacy",
                        "int",
                        "Like Extensive Catalogue but for formulae: roll DC 15 (+1 per 10 memorized) to hold one "
                        "more formula in memory.",
                    ),
                    ab(
                        "Double Dose",
                        "cra",
                        "When making an alchemical item, roll vs. formula crafting DC. Success creates two units "
                        "with one set of ingredients (potions, oils, decoctions, bombs).",
                    ),
                    ab(
                        "Adaptation",
                        "cra",
                        "Before brewing a witcher potion, roll Adaptation (DC 3 + crafting DC) to lower the "
                        "poisoning avoidance DC by 1 per point over DC (minimum 12). Failure leaves normal toxicity.",
                    ),
                ],
            },
            {
                "label": "The Improviser",
                "tiers": [
                    ab(
                        "Augmentation",
                        "cra",
                        "Roll vs. Augmentation chart DC to add special bonuses to weapons or armor in 3 rounds. "
                        "A forge grants +2; a fumble damages the item by the fumble value.",
                    ),
                    ab(
                        "Silver Coating",
                        "cra",
                        "With a forge and silver ingots (2 for 1-handed, 4 for 2-handed), roll DC 16 to add +1d6 "
                        "silver damage per 3 points above DC (max 5d6). Failure breaks the weapon.",
                    ),
                    ab(
                        "Pinpoint",
                        "cra",
                        "Study an item 1 turn and roll Pinpoint vs. its crafting DC to find a design flaw, enabling "
                        "a −6 targeted attack that deals ablation damage in half your Pinpoint value in d6.",
                    ),
                ],
            },
        ],
    },
    "Criminal": {
        "core": ab(
            "Practiced Paranoia",
            "int",
            "Within 10 m of a trap, ambush, or experimental trap, immediately roll Practiced Paranoia vs. trap DC, "
            "ambush Stealth, or GM DC. Even on failure you sense that something is wrong.",
        ),
        "paths": [
            {
                "label": "The Thief",
                "tiers": [
                    ab(
                        "Case The Area",
                        "int",
                        "Spend an hour in a settlement and roll vs. settlement DC. Success maps guard patterns and "
                        "hiding spots for +2 Stealth in that area for days equal to your value.",
                    ),
                    ab(
                        "Mental Key",
                        "int",
                        "After picking a lock, roll Mental Key vs. its DC to memorize tumblers and reopen without "
                        "a Pick Lock roll. Store as many as INT; replace freely.",
                    ),
                    ab(
                        "Go To Ground",
                        "int",
                        "Once per session, roll and split points across Area, Security, and Perks (rulebook chart) "
                        "to find a hideout until destroyed; you can always return.",
                    ),
                ],
            },
            {
                "label": "The Gang Boss",
                "tiers": [
                    ab(
                        "Weak Spot",
                        "emp",
                        "Roll vs. sentient target's Deceit to learn their most valued possession or person, plus "
                        "+1 Intimidation per 2 points above their roll until the weak spot changes.",
                    ),
                    ab(
                        "Marked Man",
                        "will",
                        "Roll vs. target's EMP×3 to mark them (carved sign, etc.). They need Charisma, Persuasion, "
                        "or Intimidation beating your roll to get help or services in their settlement.",
                    ),
                    ab(
                        "Rally",
                        "will",
                        "Once per day, spend an hour and roll Rally (GM sets DC). Recruit 1 Bandit per 2 points "
                        "above DC for days equal to Rally; bandits below half HP may flee vs. your WILL on d10.",
                    ),
                ],
            },
            {
                "label": "The Assassin",
                "tiers": [
                    ab(
                        "Careful Aim",
                        "dex",
                        "When not in active combat, spend a round aiming and roll vs. target REF×3. Next attack "
                        "gains bonus equal to half Careful Aim; being spotted before attacking halves the bonus.",
                    ),
                    ab(
                        "Eye Gouge",
                        "dex",
                        "Melee attack at −3 to hit; on hit deals 2d6 and blinds for rounds equal to Eye Gouge value.",
                    ),
                    ab(
                        "Assassin's Strike",
                        "dex",
                        "When ambushing, roll vs. target Awareness to conceal yourself after the attack. Light and "
                        "cover impose penalties; each opponent may roll to spot you.",
                    ),
                ],
            },
        ],
    },
    "Doctor": {
        "core": ab(
            "Healing Hands",
            "cra",
            "Only a Doctor with Healing Hands can heal critical wounds (multiple successes by severity; DC by "
            "severity). Also usable for any First Aid task.",
        ),
        "paths": [
            {
                "label": "The Surgeon",
                "tiers": [
                    ab(
                        "Diagnose",
                        "int",
                        "Examine a wounded subject (GM sets DC). Success reveals critical wounds and remaining HP, "
                        "plus +2 to Healing Hands on those wounds.",
                    ),
                    ab(
                        "Analysis",
                        "int",
                        "Before Healing Hands, spend a turn and roll vs. critical wound severity. Each 2 points "
                        "over DC (min 1) reduces surgery time by 1 turn.",
                    ),
                    ab(
                        "Effective Surgery",
                        "cra",
                        "Before healing a critical wound, roll vs. its Healing Hands DC. Success doubles healing "
                        "rate for critical and regular wounds.",
                    ),
                ],
            },
            {
                "label": "The Herbalist",
                "tiers": [
                    ab(
                        "Healing Tent",
                        "cra",
                        "Roll vs. GM DC to create a covered medical space in 1 hour: +3 Healing Hands/First Aid "
                        "inside and +2 healing rate for occupants for days equal to your value.",
                    ),
                    ab(
                        "Improvisation",
                        "int",
                        "Roll vs. crafting DC of a medical alchemical to substitute on-hand materials (1 round, "
                        "retry on failure). Works only for that specific injury.",
                    ),
                    ab(
                        "Herbal Remedy",
                        "cra",
                        "Mix substances into a remedy (see rulebook chart) in 1 turn; lasts 3 days, one use by "
                        "burning or chewing.",
                    ),
                ],
            },
            {
                "label": "The Anatomist",
                "tiers": [
                    ab(
                        "Bleeding Wound",
                        "int",
                        "With a bladed weapon, roll DC 15 after dealing damage. Success causes bleeding at 1 HP "
                        "per 2 points over DC until stopped by First Aid vs. your roll.",
                    ),
                    ab(
                        "Practical Carnage",
                        "int",
                        "Roll vs. opponent BODY×3 to make their wounds and critical wounds heal half as fast "
                        "(countered by Effective Surgery and healing-rate boosts).",
                    ),
                    ab(
                        "Crippling Wound",
                        "int",
                        "Attack at −6; on success imposes REF, BODY, or SPD penalty of 1 per 3 points above "
                        "defense. Removed only by Effective Surgery beating your attack roll.",
                    ),
                ],
            },
        ],
    },
    "Mage": {
        "core": ab(
            "Magic Training",
            "int",
            "Roll when encountering magical phenomena, unknown spells, or theory (GM sets DC). Success recalls "
            "full knowledge. Also works like Awareness for detecting magic, spells, and hexes.",
        ),
        "paths": [
            {
                "label": "The Politician",
                "tiers": [
                    ab(
                        "Scheming",
                        "int",
                        "Roll vs. target INT×3. Success grants +3 to Deceit, Seduction, Intimidation, or Persuasion "
                        "vs. that target for days equal to Scheming value.",
                    ),
                    ab(
                        "Grape Vine",
                        "int",
                        "Spend 1 hour and roll vs. target EMP×3 to spread rumors, lowering their local reputation "
                        "by half your Grape Vine value for that many days.",
                    ),
                    ab(
                        "Assets",
                        "int",
                        "Once per game, roll and split points across Settlement, Profession, Importance, and "
                        "Relationship (rulebook chart) to recall a helpful contact.",
                    ),
                ],
            },
            {
                "label": "The Scientist",
                "tiers": [
                    ab(
                        "Reverse Engineer",
                        "int",
                        "Study an alchemical solution 1 hour; roll vs. crafting DC + 3. Success writes a formula "
                        "that is +3 harder to craft but reliable.",
                    ),
                    ab(
                        "Distillation",
                        "cra",
                        "Use instead of Alchemy when brewing. Success creates a dose with 50% stronger effect "
                        "(duration, damage, or resistance DC—your choice, round down).",
                    ),
                    ab(
                        "Mutate",
                        "int",
                        "Spend all STA and a full day; roll vs. (28 − (BODY+WILL)/2). Success grants a minor "
                        "mutagen effect; failure puts subject in Death State with the major mutation.",
                    ),
                ],
            },
            {
                "label": "The Arch Mage",
                "tiers": [
                    ab(
                        "In Touch",
                        "will",
                        "Each point grants +2 Vigor threshold (trainable). At level 10, maximum Vigor threshold "
                        "becomes 25.",
                    ),
                    ab(
                        "Immutable",
                        "will",
                        "Roll DC 16 when affected by dimeritium. Success retains half Vigor threshold and can still "
                        "cast, though still uncomfortable.",
                    ),
                    ab(
                        "Expanded Magic",
                        "will",
                        "Before casting a spell or ritual, roll DC 16. Success lets you channel through any 2 foci, "
                        "reducing Vigor cost twice.",
                    ),
                ],
            },
        ],
    },
    "Man At Arms": {
        "core": ab(
            "Tough As Nails",
            "body",
            "At 0 or below HP, roll vs. (negative HP × 2) to keep fighting at Wound Threshold. Failure enters Death "
            "State. Further damage forces another roll based on current HP.",
        ),
        "paths": [
            {
                "label": "The Marksman",
                "tiers": [
                    ab(
                        "Extreme Range",
                        "dex",
                        "On ranged attacks beyond normal range, roll vs. distance DC to ignore range penalties "
                        "(targeting/environment penalties remain).",
                    ),
                    ab(
                        "Twin Shot",
                        "dex",
                        "Replace normal ranged skill; on hit, two projectiles strike two random body locations. "
                        "Can be dodged as one action or blocked by a shield; parry at −6.",
                    ),
                    ab(
                        "Pin Point Aim",
                        "dex",
                        "After a ranged critical, roll vs. target DEX×3. Success adds Pin Point Aim value to the "
                        "critical location roll only.",
                    ),
                ],
            },
            {
                "label": "The Bounty Hunter",
                "tiers": [
                    ab(
                        "Bloodhound",
                        "int",
                        "Add Bloodhound to Wilderness Survival when tracking. If the trail is lost, roll Bloodhound "
                        "(GM DC) to pick it up immediately.",
                    ),
                    ab(
                        "Booby Trap",
                        "cra",
                        "Set one trap type (rulebook table) with 2 m tripwire; spotting requires Awareness vs. your "
                        "Booby Trap roll.",
                    ),
                    ab(
                        "Tactical Awareness",
                        "int",
                        "Instead of moving, roll to gain +3 attack/defense vs. enemies within 10 m whose DEX×3 "
                        "is below your roll for 1 round, and learn their intended actions.",
                    ),
                ],
            },
            {
                "label": "The Reaver",
                "tiers": [
                    ab(
                        "Fury",
                        "will",
                        "Roll vs. EMP×3. Success grants immunity to fear, emotion magic, and Verbal Combat for "
                        "Fury×2 rounds; rage clouds thinking.",
                    ),
                    ab(
                        "Zweihand",
                        "body",
                        "Spend 10 STA; roll Zweihand−3 vs. defense for one double-damage armor-piercing attack "
                        "(upgrades existing piercing traits per rulebook).",
                    ),
                    ab(
                        "Shrug It Off",
                        "body",
                        "BODY times per session, spend 10 STA when an enemy scores a critical on you. Beat their "
                        "attack roll to negate the critical and take normal damage only.",
                    ),
                ],
            },
        ],
    },
    "Merchant": {
        "core": ab(
            "Well Traveled",
            "int",
            "Roll when you need a fact about an item, culture, or area (GM sets DC). Success recalls the answer "
            "from past travels.",
        ),
        "paths": [
            {
                "label": "The Broker",
                "tiers": [
                    ab(
                        "Options",
                        "int",
                        "Roll vs. GM DC to find the same item at half price (higher rarity = higher DC). Does not "
                        "apply to experimental, witcher, or relic items.",
                    ),
                    ab(
                        "Hard Bargain",
                        "emp",
                        "When bribing, roll vs. WILL×3 to use any 5-crown item for +3 Persuasion (+5 DC for absurd "
                        "bribes).",
                    ),
                    ab(
                        "Promise",
                        "emp",
                        "When buying, roll vs. salesperson EMP×3 to pay later; they wait weeks equal to Promise value.",
                    ),
                ],
            },
            {
                "label": "The Contact",
                "tiers": [
                    ab(
                        "Rookery",
                        "emp",
                        "Roll vs. settlement DC to gain 1 urchin/vagrant per point over DC (max 10) for +1 Streetwise "
                        "each; pay 1 crown per consult.",
                    ),
                    ab(
                        "Insider",
                        "int",
                        "Spend 10 crowns and roll vs. Resist Coercion to recruit a spy for days equal to Insider "
                        "(may re-roll and re-pay).",
                    ),
                    ab(
                        "Treasure Map",
                        "int",
                        "Once per session, roll vs. GM DC to recall a relic or ruin location—usually dangerous and "
                        "quest-worthy.",
                    ),
                ],
            },
            {
                "label": "The Havekar",
                "tiers": [
                    ab(
                        "Well Connected",
                        "will",
                        "On entering a settlement, spend an hour spreading word then roll vs. settlement DC. Raise "
                        "local reputation by half points over DC (min 1) for 1d6 weeks.",
                    ),
                    ab(
                        "Fence",
                        "int",
                        "Roll vs. GM DC to sell dubious/stolen goods at full market price to a no-questions buyer.",
                    ),
                    ab(
                        "Warrior's Debt",
                        "emp",
                        "Roll and split points on the Warrior chart (rulebook) to call a fighter who works for days "
                        "equal to Warrior's Debt without questioning reasonable orders.",
                    ),
                ],
            },
        ],
    },
    "Priest": {
        "core": ab(
            "Initiate of the Gods",
            "emp",
            "At same-faith churches (GM DC) gain free lodging, healing, and services. Works with lay faithful "
            "too, but they offer less. Ineffective on other faiths.",
        ),
        "paths": [
            {
                "label": "The Preacher",
                "tiers": [
                    ab(
                        "Divine Power",
                        "emp",
                        "Each level adds +1 Vigor threshold (trainable, stacks with Nature Attunement). At level 10, "
                        "threshold totals 12 from this path.",
                    ),
                    ab(
                        "Divine Authority",
                        "emp",
                        "Add full value to Leadership where your religion is worshipped; half value elsewhere.",
                    ),
                    ab(
                        "Precognition",
                        "will",
                        "When GM sends visions (3 rounds catatonic), roll vs. GM DC to interpret symbolic future "
                        "visions.",
                    ),
                ],
            },
            {
                "label": "The Druid",
                "tiers": [
                    ab(
                        "Nature Attunement",
                        "emp",
                        "Each level +1 Vigor threshold (trainable, stacks with Divine Power). At level 10, threshold "
                        "totals 12 from this path.",
                    ),
                    ab(
                        "Read Nature",
                        "int",
                        "In natural environments, roll vs. GM DC to learn what passed through and what they did—"
                        "localized, cannot track.",
                    ),
                    ab(
                        "Animal Compact",
                        "will",
                        "Add to Wilderness Survival with animals. Spend a round to ally one beast for hours equal "
                        "to value (monsters unaffected).",
                    ),
                ],
            },
            {
                "label": "The Fanatic",
                "tiers": [
                    ab(
                        "Blood Rituals",
                        "will",
                        "When casting a ritual, roll vs. casting DC to replace missing alchemical components with "
                        "5 HP blood each (can be others', spilled during the ritual).",
                    ),
                    ab(
                        "Fervor",
                        "emp",
                        "Roll vs. target INT×3 to grant 1d6 temp HP per point over DC (max 5) for Fervor×2 rounds; "
                        "once per target per day.",
                    ),
                    ab(
                        "Word of God",
                        "emp",
                        "Roll vs. Resist Coercion to gain apostles (max = value; use bandit stats). Strange orders "
                        "need Word of God vs. GM DC—3 failures lose them (fumble may turn them hostile).",
                    ),
                ],
            },
        ],
    },
    "Witcher": {
        "core": ab(
            "Witcher Training",
            "int",
            "In hostile terrain, reduce penalties by half Witcher Training (min 1). Substitutes for Monster Lore. "
            "Covers monster knowledge and adaptability from years in the keep.",
        ),
        "paths": [
            {
                "label": "The Spellsword",
                "tiers": [
                    ab(
                        "Meditation",
                        "will",
                        "Trance grants sleep benefits while remaining vigilant; considered awake for noticing threats "
                        "within double Meditation value in meters.",
                    ),
                    ab(
                        "Magical Source",
                        "will",
                        "Every 2 points grant +1 Vigor threshold (trainable). At level 10, max Vigor threshold is 7 "
                        "from this ability.",
                    ),
                    ab(
                        "Heliotrope",
                        "will",
                        "When targeted by spell/invocation/hex, roll Spell Casting vs. opponent and spend half their "
                        "Vigor cost to negate.",
                    ),
                ],
            },
            {
                "label": "The Mutant",
                "tiers": [
                    ab(
                        "Iron Stomach",
                        "body",
                        "+5% max toxicity per 2 points (trainable). At level 10, max toxicity is 150%.",
                    ),
                    ab(
                        "Frenzy",
                        "body",
                        "While poisoned, +1d6 melee per Frenzy level; must reach safety or kill poisoner. End early "
                        "with DC 15 Endurance.",
                    ),
                    ab(
                        "Transmutation",
                        "body",
                        "When taking a decoction, roll DC 18. Success grants the decoction's mutation bonus (rulebook "
                        "table) at half normal duration.",
                    ),
                ],
            },
            {
                "label": "The Slayer",
                "tiers": [
                    ab(
                        "Parry Arrows",
                        "dex",
                        "Deflect projectiles like melee parries (not non-physical magic). AoE attacks detonate after "
                        "the parry.",
                    ),
                    ab(
                        "Quick Strike",
                        "ref",
                        "After your turn, spend 5 STA and roll vs. opponent REF×3 for an extra strike that round "
                        "(disarms/trips allowed).",
                    ),
                    ab(
                        "Whirl",
                        "ref",
                        "Spend 5 STA/round to attack everyone in sword range each turn using Whirl as the attack roll; "
                        "can only whirl, dodge, and move 2 m until hit or you act otherwise.",
                    ),
                ],
            },
        ],
    },
}

def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(TREES, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(TREES)} professions)")

if __name__ == "__main__":
    main()
