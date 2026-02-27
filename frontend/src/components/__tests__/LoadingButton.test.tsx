import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LoadingButton from '../LoadingButton';

describe('LoadingButton', () => {
  it('renders children text', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<LoadingButton onClick={handleClick}>Click me</LoadingButton>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and shows spinner when loading', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('.spinner')).toBeInTheDocument();
  });

  it('shows loadingText instead of children when loading', () => {
    render(
      <LoadingButton loading loadingText="Saving...">
        Submit
      </LoadingButton>,
    );
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    // Children text should NOT appear as standalone when loadingText is provided
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('shows children text when loading but no loadingText', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoadingButton disabled>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not fire onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <LoadingButton disabled onClick={handleClick}>
        Submit
      </LoadingButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not fire onClick when loading', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <LoadingButton loading onClick={handleClick}>
        Submit
      </LoadingButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies variant styles', () => {
    render(<LoadingButton variant="destructive">Delete</LoadingButton>);
    const button = screen.getByRole('button');
    expect(button.style.backgroundColor).toBe('var(--destructive)');
  });

  it('applies size classes', () => {
    const { rerender } = render(<LoadingButton size="sm">Small</LoadingButton>);
    expect(screen.getByRole('button').className).toContain('px-3');

    rerender(<LoadingButton size="lg">Large</LoadingButton>);
    expect(screen.getByRole('button').className).toContain('px-5');
  });

  it('renders icon when provided and not loading', () => {
    render(
      <LoadingButton icon={<span data-testid="icon">★</span>}>
        Star
      </LoadingButton>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('does not render icon when loading', () => {
    render(
      <LoadingButton loading icon={<span data-testid="icon">★</span>}>
        Star
      </LoadingButton>,
    );
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<LoadingButton className="my-custom">Submit</LoadingButton>);
    expect(screen.getByRole('button').className).toContain('my-custom');
    expect(screen.getByRole('button').className).toContain('btn-interactive');
  });
});
