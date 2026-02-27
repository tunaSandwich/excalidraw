import { ROUNDNESS } from "@excalidraw/common";
import {
  degreesToRadians,
  pointDistance,
  pointFrom,
  type Degrees,
  type LocalPoint,
  type Radians,
} from "@excalidraw/math";

import { getCenterForBounds, getCommonBoundingBox } from "./bounds";
import { newArrowElement, newElement, newLinearElement } from "./newElement";

import type { BoundingBox, Bounds } from "./bounds";
import type {
  ExcalidrawArrowElement,
  ExcalidrawDiamondElement,
  ExcalidrawElement,
  ExcalidrawEllipseElement,
  ExcalidrawFreeDrawElement,
  ExcalidrawLinearElement,
  ExcalidrawRectangleElement,
  NonDeleted,
} from "./types";

type ShapeType =
  | ExcalidrawRectangleElement["type"]
  | ExcalidrawEllipseElement["type"]
  | ExcalidrawDiamondElement["type"]
  | ExcalidrawArrowElement["type"]
  | ExcalidrawLinearElement["type"]
  | ExcalidrawFreeDrawElement["type"];

interface ShapeRecognitionResult {
  type: ShapeType;
  simplified: readonly LocalPoint[];
  boundingBox: BoundingBox;
}

const QUADRILATERAL_SIDES = 4;
const QUADRILATERAL_MIN_POINTS = 4;
const QUADRILATERAL_MAX_POINTS = 5;
const ARROW_EXPECTED_POINTS = 5;
const LINE_EXPECTED_POINTS = 2;

const DEFAULT_OPTIONS = {
  shapeIsClosedPercentThreshold: 20,
  shapeIsClosedDistanceThreshold: 10,
  rdpTolerancePercent: 10,
  arrowMinTipAngle: 30,
  arrowMaxTipAngle: 150,
  arrowHeadMaxShaftRatio: 0.8,
  rectangleMinCornerAngle: 20,
  rectangleMaxCornerAngle: 160,
  rectangleOrientationAngleThreshold: 10,
  ellipseRadiusVarianceThreshold: 0.5,
} as const;

type ShapeRecognitionOptions = typeof DEFAULT_OPTIONS;
type PartialShapeRecognitionOptions = Partial<ShapeRecognitionOptions>;

type QuadrilateralSide = {
  length: number;
  angleRad: number;
};

const perpendicularDistance = (
  point: LocalPoint,
  start: LocalPoint,
  end: LocalPoint,
) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  if (dx === 0 && dy === 0) {
    return pointDistance(point, start);
  }

  const numerator = Math.abs(
    dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0],
  );

  return numerator / Math.hypot(dx, dy);
};

const simplifyRDP = (
  points: readonly LocalPoint[],
  epsilon: number,
): readonly LocalPoint[] => {
  if (points.length < 3) {
    return points;
  }

  const first = points[0];
  const last = points[points.length - 1];

  let splitIndex = -1;
  let maxDist = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      splitIndex = i;
    }
  }

  if (maxDist > epsilon && splitIndex !== -1) {
    const left = simplifyRDP(points.slice(0, splitIndex + 1), epsilon);
    const right = simplifyRDP(points.slice(splitIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
};

const angleBetween = (
  p0: LocalPoint,
  p1: LocalPoint,
  p2: LocalPoint,
): Radians => {
  const v1x = p0[0] - p1[0];
  const v1y = p0[1] - p1[1];
  const v2x = p2[0] - p1[0];
  const v2y = p2[1] - p1[1];

  const magnitude1 = Math.hypot(v1x, v1y);
  const magnitude2 = Math.hypot(v2x, v2y);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0 as Radians;
  }

  let cosine = (v1x * v2x + v1y * v2y) / (magnitude1 * magnitude2);
  cosine = Math.max(-1, Math.min(1, cosine));

  return Math.acos(cosine) as Radians;
};

const polygonIsClosed = (points: readonly LocalPoint[], threshold: number) => {
  if (points.length < 3) {
    return false;
  }
  return pointDistance(points[0], points[points.length - 1]) <= threshold;
};

const calculateQuadrilateralSides = (
  vertices: readonly LocalPoint[],
): QuadrilateralSide[] => {
  const segments: QuadrilateralSide[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];

    let angleRad = Math.atan2(dy, dx);
    if (angleRad < 0) {
      angleRad += 2 * Math.PI;
    }
    if (angleRad >= Math.PI) {
      angleRad -= Math.PI;
    }

    segments.push({
      length: Math.hypot(dx, dy),
      angleRad,
    });
  }

  return segments;
};

const isAxisAligned = (
  sides: QuadrilateralSide[],
  orientationThreshold: number,
) =>
  sides.some((segment) => {
    const angle = segment.angleRad;
    const distToHorizontal = Math.min(angle, Math.PI - angle);
    const distToVertical = Math.abs(angle - Math.PI / 2);
    return (
      distToHorizontal < orientationThreshold ||
      distToVertical < orientationThreshold
    );
  });

const calculateRadiusVariance = (
  points: readonly LocalPoint[],
  boundingBox: BoundingBox,
) => {
  if (!points.length) {
    return 0;
  }

  const [centerX, centerY] = getCenterForBounds([
    boundingBox.minX,
    boundingBox.minY,
    boundingBox.maxX,
    boundingBox.maxY,
  ] as Bounds);

  let totalDist = 0;
  let maxDist = 0;
  let minDist = Infinity;

  for (const point of points) {
    const dist = pointDistance(point, pointFrom(centerX, centerY));
    totalDist += dist;
    maxDist = Math.max(maxDist, dist);
    minDist = Math.min(minDist, dist);
  }

  const averageDist = totalDist / points.length;
  if (averageDist === 0) {
    return 0;
  }

  return (maxDist - minDist) / averageDist;
};

const checkLine = (points: readonly LocalPoint[], isClosed: boolean) => {
  if (!isClosed && points.length === LINE_EXPECTED_POINTS) {
    return "line" as const;
  }
  return null;
};

const checkArrow = (
  points: readonly LocalPoint[],
  isClosed: boolean,
  options: ShapeRecognitionOptions,
) => {
  if (isClosed || points.length !== ARROW_EXPECTED_POINTS) {
    return null;
  }

  const shaftStart = points[0];
  const shaftEnd = points[1];
  const arrowHeadStart = points[2];
  const arrowTip = points[3];
  const arrowHeadEnd = points[4];

  const tipAngle = angleBetween(arrowTip, arrowHeadStart, arrowHeadEnd);

  if (
    tipAngle <= degreesToRadians(options.arrowMinTipAngle as Degrees) ||
    tipAngle >= degreesToRadians(options.arrowMaxTipAngle as Degrees)
  ) {
    return null;
  }

  const headSegment1Len = pointDistance(arrowHeadStart, arrowTip);
  const headSegment2Len = pointDistance(arrowTip, arrowHeadEnd);
  const shaftLen = pointDistance(shaftStart, shaftEnd);

  const isHeadShortEnough =
    headSegment1Len < shaftLen * options.arrowHeadMaxShaftRatio &&
    headSegment2Len < shaftLen * options.arrowHeadMaxShaftRatio;

  return isHeadShortEnough ? ("arrow" as const) : null;
};

const checkQuadrilateral = (
  points: readonly LocalPoint[],
  isClosed: boolean,
  options: ShapeRecognitionOptions,
) => {
  if (
    !isClosed ||
    points.length < QUADRILATERAL_MIN_POINTS ||
    points.length > QUADRILATERAL_MAX_POINTS
  ) {
    return null;
  }

  const vertices = points.slice(0, QUADRILATERAL_SIDES);

  const angles = [] as number[];
  for (let i = 0; i < QUADRILATERAL_SIDES; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % QUADRILATERAL_SIDES];
    const p3 = vertices[(i + 2) % QUADRILATERAL_SIDES];
    angles.push(angleBetween(p1, p2, p3));
  }

  const allCornersAreValid = angles.every(
    (angle) =>
      angle > degreesToRadians(options.rectangleMinCornerAngle as Degrees) &&
      angle < degreesToRadians(options.rectangleMaxCornerAngle as Degrees),
  );

  if (!allCornersAreValid) {
    return null;
  }

  const sides = calculateQuadrilateralSides(vertices);

  if (
    isAxisAligned(
      sides,
      degreesToRadians(options.rectangleOrientationAngleThreshold as Degrees),
    )
  ) {
    return "rectangle" as const;
  }

  return "diamond" as const;
};

const checkEllipse = (
  points: readonly LocalPoint[],
  isClosed: boolean,
  boundingBox: BoundingBox,
  options: ShapeRecognitionOptions,
) => {
  if (!isClosed || points.length < QUADRILATERAL_MAX_POINTS) {
    return null;
  }

  const radiusVariance = calculateRadiusVariance(points, boundingBox);
  return radiusVariance < options.ellipseRadiusVarianceThreshold
    ? ("ellipse" as const)
    : null;
};

export const recognizeShape = (
  element: ExcalidrawFreeDrawElement,
  opts: PartialShapeRecognitionOptions = {},
): ShapeRecognitionResult => {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const { points } = element;
  const boundingBox = getCommonBoundingBox([element]);

  if (points.length < 3) {
    return { type: "freedraw", simplified: points, boundingBox };
  }

  const boundingBoxDiagonal = Math.hypot(boundingBox.width, boundingBox.height);
  const rdpTolerance =
    boundingBoxDiagonal * (options.rdpTolerancePercent / 100);
  const simplifiedPoints = simplifyRDP(points, rdpTolerance);
  const closureThreshold = Math.max(
    options.shapeIsClosedDistanceThreshold,
    boundingBoxDiagonal * (options.shapeIsClosedPercentThreshold / 100),
  );
  const isClosed = polygonIsClosed(points, closureThreshold);

  const recognizedType: ShapeType =
    checkLine(simplifiedPoints, isClosed) ??
    checkArrow(simplifiedPoints, isClosed, options) ??
    checkQuadrilateral(simplifiedPoints, isClosed, options) ??
    checkEllipse(simplifiedPoints, isClosed, boundingBox, options) ??
    "freedraw";

  return {
    type: recognizedType,
    simplified: simplifiedPoints,
    boundingBox,
  };
};

export const convertToShape = (
  freeDrawElement: NonDeleted<ExcalidrawFreeDrawElement>,
): NonDeleted<ExcalidrawElement> => {
  const recognizedShape = recognizeShape(freeDrawElement);

  switch (recognizedShape.type) {
    case "rectangle":
    case "diamond":
    case "ellipse":
      return newElement({
        ...freeDrawElement,
        type: recognizedShape.type,
        roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
        x: recognizedShape.boundingBox.minX,
        y: recognizedShape.boundingBox.minY,
        width: recognizedShape.boundingBox.width,
        height: recognizedShape.boundingBox.height,
      });
    case "arrow": {
      if (recognizedShape.simplified.length < 4) {
        return freeDrawElement;
      }

      const tipPoint =
        recognizedShape.simplified[recognizedShape.simplified.length - 2] ||
        recognizedShape.simplified[recognizedShape.simplified.length - 1];

      return newArrowElement({
        ...freeDrawElement,
        type: "arrow",
        roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
        points: [recognizedShape.simplified[0], tipPoint],
      });
    }
    case "line": {
      if (recognizedShape.simplified.length < 2) {
        return freeDrawElement;
      }

      return newLinearElement({
        ...freeDrawElement,
        type: "line",
        roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
        points: [
          recognizedShape.simplified[0],
          recognizedShape.simplified[recognizedShape.simplified.length - 1],
        ],
      });
    }
    default:
      return freeDrawElement;
  }
};
