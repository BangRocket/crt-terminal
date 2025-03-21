import React, { useState } from 'react';
import { CommandLine as CommandLineState } from '../../hooks/terminal/useCommandLine';
import { TerminalControllerReturnType } from '../../hooks/useTerminalController';
import Character from '../Character/Character';
import InputString from './components/InputString/InputString';
import Input from './components/Input';
import classes from './command-line.module.scss';

interface CommandLineProps {
  locked: boolean;
  prompt: string;
  cursorSymbol: string;
  state: CommandLineState;
  handleKeyboardDown: TerminalControllerReturnType['handlers']['handleKeyboardDown'];
  handleInputChange: TerminalControllerReturnType['handlers']['handleInputChange'];
  autoComplete: boolean;
}

const CommandLine = React.forwardRef<HTMLInputElement, CommandLineProps>(
  (
    {
      state: { cursorPosition, renderValue, inputValue },
      handleKeyboardDown,
      handleInputChange,
      prompt,
      cursorSymbol,
      autoComplete,
      locked
    },
    inputElement
  ) => {
    const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
      handleInputChange(event);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      handleKeyboardDown(event);
    };

    const [hasFocus, setHasFocus] = useState<boolean>(false)
    
    const handleOnFocus = () => {
      setHasFocus(true)
    }

    const handleOnBlur = () => {
      setHasFocus(false)
    }

    const lastSelected = cursorPosition === renderValue.length;

    return (
      <div className={[classes.commandLine, 'crt-command-line'].join(' ')}>
        <span className="crt-command-line__prompt">{prompt}</span>
        <div className={[classes.inputWrap, 'crt-command-line__input-wrapper'].join(' ')}>
          <Input
            className={[classes.input, 'crt-command-line__input'].join(' ')}
            id="crt-command-line-input"
            ref={inputElement}
            value={inputValue}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={handleOnFocus}
            onBlur={handleOnBlur}
            autoComplete={autoComplete ? "on" : "off"}
            type="text"
          />
          <div className={[classes.inputString, 'crt-command-line__input-string'].join(' ')}>
            <InputString renderValue={renderValue} cursorPosition={cursorPosition} hasFocus={hasFocus} locked={locked} />
            {lastSelected && (
              <Character className="crt-cursor-symbol" selected hasFocus={hasFocus} locked={locked}>
                {cursorSymbol}
              </Character>
            )}
          </div>
        </div>
      </div>
    );
  },
);

CommandLine.displayName = 'CommandLine';
export default CommandLine;
