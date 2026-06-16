const DEFAULT_PERKS = [
  "Priority access to available residences",
  "Full-floor interactive previews",
  "Dedicated concierge support",
];

export default function PremiumPerks({ items = DEFAULT_PERKS, compact = false }) {
  return (
    <ul className={"premium-perks" + (compact ? " premium-perks--compact" : "")}>
      {items.map((item) => (
        <li key={item}>
          <span className="premium-perks-mark" aria-hidden="true">
            &#10022;
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
