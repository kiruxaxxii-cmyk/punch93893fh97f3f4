export default function GeometricBg() {
  return (
    <div className="geometric-bg" aria-hidden="true">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="geo-blocks"
            width="280"
            height="400"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-35)"
          >
            <rect width="280" height="400" fill="transparent" />
            <rect x="0" y="8" width="280" height="3" fill="#151515" />
            <rect x="0" y="16" width="280" height="9" fill="#101010" />
            <rect x="0" y="31" width="280" height="5" fill="#161616" />
            <rect x="0" y="42" width="280" height="14" fill="#0e0e0e" />
            <rect x="0" y="62" width="280" height="4" fill="#171717" />
            <rect x="0" y="72" width="280" height="10" fill="#111111" />
            <rect x="0" y="88" width="280" height="6" fill="#141414" />
            <rect x="0" y="100" width="280" height="12" fill="#0f0f0f" />
            <rect x="0" y="118" width="280" height="3" fill="#161616" />
            <rect x="0" y="127" width="280" height="7" fill="#121212" />
            <rect x="0" y="140" width="280" height="16" fill="#0d0d0d" />
            <rect x="0" y="162" width="280" height="4" fill="#151515" />
            <rect x="0" y="172" width="280" height="9" fill="#111111" />
            <rect x="0" y="187" width="280" height="5" fill="#141414" />
            <rect x="0" y="198" width="280" height="11" fill="#0f0f0f" />
            <rect x="0" y="215" width="280" height="3" fill="#171717" />
            <rect x="0" y="224" width="280" height="8" fill="#121212" />
            <rect x="0" y="238" width="280" height="13" fill="#0e0e0e" />
            <rect x="0" y="257" width="280" height="5" fill="#151515" />
            <rect x="0" y="268" width="280" height="7" fill="#111111" />
            <rect x="0" y="281" width="280" height="4" fill="#141414" />
            <rect x="0" y="291" width="280" height="10" fill="#101010" />
            <rect x="0" y="307" width="280" height="6" fill="#131313" />
            <rect x="0" y="319" width="280" height="15" fill="#0d0d0d" />
            <rect x="0" y="340" width="280" height="3" fill="#161616" />
            <rect x="0" y="349" width="280" height="8" fill="#121212" />
            <rect x="0" y="363" width="280" height="5" fill="#141414" />
            <rect x="0" y="374" width="280" height="11" fill="#0f0f0f" />
            <rect x="0" y="391" width="280" height="4" fill="#151515" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#0a0a0a" />
        <rect width="100%" height="100%" fill="url(#geo-blocks)" />
      </svg>
    </div>
  );
}
