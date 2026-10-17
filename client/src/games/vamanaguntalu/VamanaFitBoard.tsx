import { VamanaBoardGrid, type VamanaBoardGridProps } from "./VamanaBoardGrid";
import { useFitBox } from "./useFitBox";
import { boardGeometry } from "./vamanaTheme";

/** The board, drawn as large as the space around it allows while keeping its shape. */
export function VamanaFitBoard(props: Omit<VamanaBoardGridProps, "size" | "className">) {
  const { aspect } = boardGeometry(props.orientation, props.hasOrnaments ?? true);
  const { ref, size } = useFitBox(aspect);
  return (
    <div ref={ref} className="flex h-full min-h-0 w-full min-w-0 items-center justify-center">
      <VamanaBoardGrid {...props} size={size} />
    </div>
  );
}
