import { useEffect, useRef, useState } from 'react';
import {
  isMoveActions,
  isPreventedActions,
  isSubmitActions,
  isRemoveActions,
  isServiceActions,
  PreventProps,
  Keyboard,
} from '../API/keyboard';
import { commandLine, commandWord } from '../API/sentence/sentence';
import { PrintableItem } from '../API/printer';
import { CommandLineInputReturnType } from './terminal/useCommandLineInput';
import { CommandLineReturnType } from './terminal/useCommandLine';
import { CommandScreenReturnType } from './terminal/useCommandScreen';
import { CommandHistoryReturnType } from './terminal/useCommandHistory';
import { LoaderReturnType } from './terminal/useLoader';
import { TerminalAppReturnType } from './terminal/useTerminalApp';
import { EventQueueReturnType, PrinterEvents } from './eventQueue/useEventQueue';

type InputControllerProps = {
  handlers: CommandLineInputReturnType['handlers'];
};

type CommandScreenProps = {
  handlers: CommandScreenReturnType['handlers'];
};

type CommandLLineControllerProps = CommandLineReturnType;

interface KeyboardKeyDownEvent extends PreventProps {
  key: string;
}

type ControllerQueue = Pick<EventQueueReturnType, 'api'>;

type OnCommandCallback = (command: string) => void;

interface TerminalControllerProps {
  terminalApp: TerminalAppReturnType;
  input: InputControllerProps;
  commandLine: CommandLLineControllerProps;
  commandHistory: CommandHistoryReturnType;
  commandScreen: CommandScreenProps;
  loaderComponent: LoaderReturnType;
  interface: {
    prompt: string;
    banner?: PrintableItem;
    onCommand: OnCommandCallback;
    queue: ControllerQueue;
  };
  focusOnMount: boolean;
  allowEmptyCommand: boolean;
}

type TerminalControllerReturnType = ReturnType<typeof useTerminalController>;

type CommandWordProps = Parameters<typeof commandWord>[0];

const printCommandLine = ({ characters, prompt }: CommandWordProps) =>
  commandLine({ words: [commandWord({ characters, prompt })] });

function useTerminalController({
  terminalApp: {
    state: { inputLocked },
    handlers: { lock: lockApp },
  },
  input: {
    handlers: { setInputCursor, focus: focusInput },
  },
  commandScreen: {
    handlers: { print: printOnScreen, clear: clearScreen },
  },
  commandLine: {
    state: { cursorPosition, inputValue },
    handlers: {
      preventDefault,
      addCharacter,
      removeCharacter,
      moveCommandCursor,
      submitCommand,
      provideCommandService,
    },
  },
  commandHistory: {
    handlers: { addCommand, nextCommand, prevCommand },
  },
  loaderComponent: {
    isLoading: loaderLoading,
    handlers: { startLoading: startComponentLoading, endLoading: endComponentLoading },
  },
  interface: {
    onCommand,
    prompt,
    banner,
    queue: {
      api: { enqueue },
    },
  },
  focusOnMount,
  allowEmptyCommand,
}: TerminalControllerProps) {
  const [lockedByLoader, setLockedByLoader] = useState(false);

  const focus = () => {
    focusInput();
  };

  const lock = (locked: boolean) => {
    const attemptUnlockLoader = loaderLoading && !locked;
    if (attemptUnlockLoader) return;
    lockApp(locked);
  };

  const clear = clearScreen;

  const print = printOnScreen;

  const lockByLoader = (lockState: boolean) => {
    const needToLock = lockState && lockState !== inputLocked;
    const needToUnlock = !lockState && lockedByLoader;

    if (needToLock) {
      lockApp(true);
      setLockedByLoader(true);
    } else if (needToUnlock) {
      lockApp(false);
      setLockedByLoader(false);
    }
  };

  const loading = (loadingState: boolean) => {
    if (loadingState && !loaderLoading) {
      lockByLoader(true);
      startComponentLoading();
    } else if (!loadingState && loaderLoading) {
      endComponentLoading();
      lockByLoader(false);
    }
  };

  const handleInputChange = (event: React.FormEvent<HTMLInputElement>) => {
    if (inputLocked) return;
    const newValue = event.currentTarget.value;
    // Use optional chaining to safely access nativeEvent properties
    // This ensures compatibility with React 19's synthetic events
    const nativeEvent = event.nativeEvent as InputEvent | undefined;

    if (nativeEvent?.inputType === 'insertText') addCharacter(newValue);
    if (nativeEvent?.inputType === 'insertFromPaste') addCharacter(newValue);
    if (nativeEvent?.inputType === 'deleteContentBackward') removeCharacter(Keyboard.BACKSPACE);
    if (nativeEvent?.inputType === 'deleteContentForward') removeCharacter(Keyboard.DELETE);
  };

  const handleKeyboardEvent = (key: string) => {
    if (isMoveActions(key)) moveCommandCursor(key);
    if (isRemoveActions(key)) removeCharacter(key);
    if (isServiceActions(key)) provideCommandService(key, { nextCommand, prevCommand });

    if (isSubmitActions(key)) {
      submitCommand();

      const characters = inputValue.trim();
      if (characters || allowEmptyCommand) {
        addCommand(characters);
        enqueue({ type: PrinterEvents.PRINT, payload: [printCommandLine({ characters, prompt })] });
        onCommand(characters);
      }
    }
  };

  const handleKeyboardDown = (event: KeyboardKeyDownEvent) => {
    const { key } = event;

    if (isPreventedActions(key)) preventDefault(event);
    if (!inputLocked) handleKeyboardEvent(key);
  };

  useEffect(() => {
    setInputCursor(cursorPosition);
    // disabled due to inner structure: setInputCursor refers to ref input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorPosition]);

  const loaded = useRef(false);

  useEffect(() => {
    if (banner && !loaded.current) {
      loaded.current = true;
      enqueue({ type: PrinterEvents.PRINT, payload: banner });
    }
    if (focusOnMount) {
      focusInput();
    }
    // disabled due to inner structure: hook should print banner on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    handlers: {
      focus,
      lock,
      clear,
      print,
      handleInputChange,
      handleKeyboardDown,
      loading,
    },
  };
}

export type {
  TerminalControllerReturnType,
  TerminalControllerProps,
  OnCommandCallback,
  ControllerQueue,
};
export { useTerminalController };
