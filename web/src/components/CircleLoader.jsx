export default function CircleLoader({ visible }) {
  return (
    <div className={visible ? "circle-loader circle-loader--visible" : "circle-loader"} aria-hidden={!visible}>
      <span className="circle-loader__ring" />
    </div>
  );
}
