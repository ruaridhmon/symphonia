import { CSSProperties } from 'react';

type SkeletonVariant = 'text' | 'card' | 'button' | 'avatar';

interface SkeletonProps {
	variant?: SkeletonVariant;
	width?: string | number;
	height?: string | number;
	className?: string;
	style?: CSSProperties;
	lines?: number; // For text variant: number of text lines
}

/**
 * Skeleton — Animated loading placeholder component
 * 
 * Variants:
 * - text: Single or multi-line text placeholder (default)
 * - card: Full card-shaped skeleton
 * - button: Button-shaped skeleton
 * - avatar: Circular avatar skeleton
 */
export default function Skeleton({
	variant = 'text',
	width,
	height,
	className = '',
	style = {},
	lines = 1,
}: SkeletonProps) {
	// Base styles for all skeletons
	const baseStyle: CSSProperties = {
		backgroundColor: 'var(--skeleton-base, var(--muted))',
		borderRadius: 'var(--skeleton-radius, 0.375rem)',
		position: 'relative',
		overflow: 'hidden',
		...style,
	};

	// Variant-specific dimensions and styles
	const variantStyles: Record<SkeletonVariant, CSSProperties> = {
		text: {
			width: width || '100%',
			height: height || '1rem',
			borderRadius: '0.25rem',
		},
		card: {
			width: width || '100%',
			height: height || '12rem',
			borderRadius: '0.5rem',
		},
		button: {
			width: width || '7rem',
			height: height || '2.5rem',
			borderRadius: '0.5rem',
		},
		avatar: {
			width: width || '3rem',
			height: height || '3rem',
			borderRadius: '50%',
		},
	};

	const combinedStyle = {
		...baseStyle,
		...variantStyles[variant],
	};

	// For text variant with multiple lines
	if (variant === 'text' && lines > 1) {
		return (
			<div className={`skeleton-text-group ${className}`} style={{ width: width || '100%' }}>
				{Array.from({ length: lines }).map((_, i) => (
					<div
						key={i}
						className="skeleton"
						style={{
							...combinedStyle,
							marginBottom: i < lines - 1 ? '0.5rem' : 0,
							// Last line is typically shorter
							width: i === lines - 1 ? '80%' : '100%',
						}}
					/>
				))}
			</div>
		);
	}

	return <div className={`skeleton ${className}`} style={combinedStyle} />;
}

/**
 * SkeletonGroup — Pre-composed skeleton layouts
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
	return (
		<div
			className={`skeleton-card ${className}`}
			style={{
				padding: '1.5rem',
				borderRadius: '0.5rem',
				backgroundColor: 'var(--card)',
				border: '1px solid var(--border)',
			}}
		>
			<Skeleton variant="text" height="1.5rem" width="60%" style={{ marginBottom: '1rem' }} />
			<Skeleton variant="text" lines={3} />
		</div>
	);
}

export function SkeletonForm({ className = '' }: { className?: string }) {
	return (
		<div className={`skeleton-form ${className}`} style={{ width: '100%' }}>
			<Skeleton variant="text" height="1.5rem" width="40%" style={{ marginBottom: '1rem' }} />
			<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
				<Skeleton variant="button" width="100%" height="2.5rem" />
				<Skeleton variant="button" width="100%" height="2.5rem" />
				<Skeleton variant="button" width="100%" height="2.5rem" />
			</div>
		</div>
	);
}

export function SkeletonTable({ rows = 3, className = '' }: { rows?: number; className?: string }) {
	return (
		<div className={`skeleton-table ${className}`} style={{ width: '100%' }}>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					gap: '1rem',
					marginBottom: '0.75rem',
					padding: '0.75rem',
					backgroundColor: 'var(--muted)',
					borderRadius: '0.375rem',
				}}
			>
				<Skeleton variant="text" width="25%" />
				<Skeleton variant="text" width="20%" />
				<Skeleton variant="text" width="20%" />
				<Skeleton variant="text" width="15%" />
				<Skeleton variant="text" width="20%" />
			</div>
			{/* Rows */}
			{Array.from({ length: rows }).map((_, i) => (
				<div
					key={i}
					style={{
						display: 'flex',
						gap: '1rem',
						marginBottom: '0.5rem',
						padding: '0.75rem',
						borderBottom: '1px solid var(--border)',
					}}
				>
					<Skeleton variant="text" width="25%" />
					<Skeleton variant="text" width="20%" />
					<Skeleton variant="text" width="20%" />
					<Skeleton variant="text" width="15%" />
					<Skeleton variant="text" width="20%" />
				</div>
			))}
		</div>
	);
}

export function SkeletonDashboard({ className = '' }: { className?: string }) {
	return (
		<div className={`skeleton-dashboard ${className}`} style={{ width: '100%' }}>
			{/* Create form card skeleton */}
			<div
				style={{
					padding: '1.5rem',
					marginBottom: '2rem',
					borderRadius: '0.5rem',
					backgroundColor: 'var(--card)',
					border: '1px solid var(--border)',
				}}
			>
				<Skeleton variant="text" height="1.5rem" width="40%" style={{ marginBottom: '1.5rem' }} />
				<Skeleton variant="button" width="100%" height="2.5rem" style={{ marginBottom: '1rem' }} />
				<Skeleton variant="button" width="100%" height="2.5rem" style={{ marginBottom: '1rem' }} />
				<Skeleton variant="button" width="100%" height="2.5rem" style={{ marginBottom: '1rem' }} />
				<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
					<Skeleton variant="button" width="8rem" />
					<Skeleton variant="button" width="8rem" />
				</div>
			</div>

			{/* Existing forms skeleton */}
			<div
				style={{
					padding: '1.5rem',
					borderRadius: '0.5rem',
					backgroundColor: 'var(--card)',
					border: '1px solid var(--border)',
				}}
			>
				<Skeleton variant="text" height="1.5rem" width="30%" style={{ marginBottom: '1.5rem' }} />
				<SkeletonTable rows={3} />
			</div>
		</div>
	);
}
