import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

// Lucide "download" in the animate-ui icon shape: the arrow drops into the tray.
type DownloadProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    arrow: {
      initial: {
        y: 0,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
      animate: {
        y: 2,
        transition: { ease: 'easeInOut', duration: 0.3 },
      },
    },
    tray: {},
  } satisfies Record<string, Variants>,
  'default-loop': {
    arrow: {
      initial: {
        y: 0,
      },
      animate: {
        y: [0, 2, 0],
        transition: { ease: 'easeInOut', duration: 0.6 },
      },
    },
    tray: {},
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: DownloadProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
        variants={variants.tray}
        initial="initial"
        animate={controls}
      />
      <motion.g variants={variants.arrow} initial="initial" animate={controls}>
        <motion.path d="M12 3v12" />
        <motion.path d="m7 10 5 5 5-5" />
      </motion.g>
    </motion.svg>
  );
}

function Download(props: DownloadProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Download,
  Download as DownloadIcon,
  type DownloadProps,
  type DownloadProps as DownloadIconProps,
};
