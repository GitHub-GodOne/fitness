type MessageLeaf = string | number | boolean | null;

export type FlattenedMessage = {
  key: string;
  value: string;
};

function isLeafValue(value: unknown): value is MessageLeaf {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function flattenMessageLeaves(
  input: unknown,
  prefix = ''
): FlattenedMessage[] {
  if (isLeafValue(input)) {
    return prefix ? [{ key: prefix, value: String(input ?? '') }] : [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item, index) =>
      flattenMessageLeaves(item, prefix ? `${prefix}.${index}` : String(index))
    );
  }

  if (!input || typeof input !== 'object') {
    return [];
  }

  return Object.entries(input).flatMap(([key, value]) =>
    flattenMessageLeaves(value, prefix ? `${prefix}.${key}` : key)
  );
}

function createContainer(nextSegment?: string) {
  return nextSegment && /^\d+$/.test(nextSegment) ? [] : {};
}

export function setDeepMessageValue(
  target: Record<string, any>,
  path: string,
  value: string
) {
  if (!path) {
    return target;
  }

  const segments = path.split('.').filter(Boolean);
  let cursor: any = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const key: string | number = /^\d+$/.test(segment)
      ? Number(segment)
      : segment;

    if (isLast) {
      cursor[key] = value;
      break;
    }

    if (
      cursor[key] === undefined ||
      cursor[key] === null ||
      typeof cursor[key] !== 'object'
    ) {
      cursor[key] = createContainer(nextSegment);
    }

    cursor = cursor[key];
  }

  return target;
}

export function applyMessageOverride(
  messages: Record<string, any>,
  namespace: string,
  key: string,
  value: string
) {
  const fullPath = [namespace, key].filter(Boolean).join('.');
  setDeepMessageValue(messages, fullPath, value);
  return messages;
}
