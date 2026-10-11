import type { Visual } from "../../shared/schema";
import type { Theme } from "../theme";
import { BarChartScene } from "./BarChartScene";
import { BulletsScene } from "./BulletsScene";
import { ComparisonScene } from "./ComparisonScene";
import { IconGridScene } from "./IconGridScene";
import { KineticScene } from "./KineticScene";
import { MapScene } from "./MapScene";
import { Object3DScene } from "./Object3DScene";
import { ProcessScene } from "./ProcessScene";
import { QuoteScene } from "./QuoteScene";
import { StatScene } from "./StatScene";
import { TimelineScene } from "./TimelineScene";
import { TitleScene } from "./TitleScene";

type Props = { visual: Visual; reveals: number[]; theme: Theme; durationInFrames: number };

export const SceneVisual: React.FC<Props> = ({ visual, ...rest }) => {
  switch (visual.type) {
    case "title": return <TitleScene visual={visual} {...rest} />;
    case "bullets": return <BulletsScene visual={visual} {...rest} />;
    case "stat": return <StatScene visual={visual} {...rest} />;
    case "comparison": return <ComparisonScene visual={visual} {...rest} />;
    case "process": return <ProcessScene visual={visual} {...rest} />;
    case "barChart": return <BarChartScene visual={visual} {...rest} />;
    case "iconGrid": return <IconGridScene visual={visual} {...rest} />;
    case "timeline": return <TimelineScene visual={visual} {...rest} />;
    case "quote": return <QuoteScene visual={visual} {...rest} />;
    case "kinetic": return <KineticScene visual={visual} {...rest} />;
    case "map": return <MapScene visual={visual} {...rest} />;
    case "object3d": return <Object3DScene visual={visual} {...rest} />;
  }
};
