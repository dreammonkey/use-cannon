import { Vec3, Sphere, Box, Plane, ConvexPolyhedron, Trimesh, Heightfield, Shape } from 'cannon-es'
import { MeshBasicMaterial, SphereGeometry, BoxGeometry, PlaneGeometry, CylinderGeometry, Mesh, Geometry, Vector3, Face3, Quaternion } from 'three'

export function renderWireframes(scene, bodies) {
    const _meshes = []
    const _material = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    const _tempVec0 = new Vec3()
    const _tempVec1 = new Vec3()
    const _tempVec2 = new Vec3()
    const _tempQuat0 = new Vec3()
    const _sphereGeometry = new SphereGeometry(1)
    const _boxGeometry = new BoxGeometry(1, 1, 1)
    const _planeGeometry = new PlaneGeometry(10, 10, 10, 10)
    const _cylinderGeometry = new CylinderGeometry(0.5, 0.5, 1, 32)

    function createConvexPolyhedronGeometry(shape) {
        const geometry = new Geometry()
        shape.vertices.forEach(({ x, y, z}) => geometry.vertices.push(new Vector3(x, y, z)))
        shape.faces.forEach(face => {
            for (let i = 1; i < face.length - 1; i++) {
                geometry.faces.push(new Face3(face[0], face[i], face[i + 1]))
            }
        })
        geometry.computeBoundingSphere()
        geometry.computeFaceNormals()
        return geometry
    }
    
    function createTrimeshGeometry(shape) {
        const geometry = new Geometry()
        const v0 = _tempVec0
        const v1 = _tempVec1
        const v2 = _tempVec2
        
        for (let i = 0; i < shape.indices.length / 3; i++) {
            shape.getTriangleVertices(i, v0, v1, v2)
            geometry.vertices.push(
                new Vector3(v0.x, v0.y, v0.z),
                new Vector3(v1.x, v1.y, v1.z),
                new Vector3(v2.x, v2.y, v2.z),
            )
            const index = geometry.vertices.length - 3
            geometry.faces.push(new Face3(index, index + 1, index + 2))
        }
    
        geometry.computeBoundingSphere()
        geometry.computeFaceNormals()
        return geometry
    }
    
    function createHeightfieldGeometry(shape) {
        const geometry = new Geometry()
        const v0 = _tempVec0
        const v1 = _tempVec1
        const v2 = _tempVec2
        const { data } = shape

        for (let i = 0; i < data.length - 1; i++) {
            for (let j = 0; j < data[i].length - 1; j++) {
                for (let k = 0; k < 2; k++) {
                    shape.getConvexTrianglePillar(i, j, k === 0)
                    v0.copy(shape.pillarConvex.vertices[0])
                    v1.copy(shape.pillarConvex.vertices[1])
                    v2.copy(shape.pillarConvex.vertices[2])
                    v0.vadd(shape.pillarOffset, v0)
                    v1.vadd(shape.pillarOffset, v1)
                    v2.vadd(shape.pillarOffset, v2)

                    geometry.vertices.push(
                        new Vector3(v0.x, v0.y, v0.z),
                        new Vector3(v1.x, v1.y, v1.z),
                        new Vector3(v2.x, v2.y, v2.z),
                    )

                    const index = geometry.vertices.length - 3
                    geometry.faces.push(new Face3(index, index + 1, index + 2))
                }
            }
        }

        geometry.computeBoundingSphere()
        geometry.computeFaceNormals()
        return geometry
    }

    function createMesh(shape) {
        let mesh = new Mesh();
        const { SPHERE, BOX, PLANE, CYLINDER, CONVEXPOLYHEDRON, TRIMESH, HEIGHTFIELD } = Shape.types;

        switch (shape.type) {
            case SPHERE: {
                mesh = new Mesh(_sphereGeometry, _material)
                break
            }

            case BOX: {
                mesh = new Mesh(_boxGeometry, _material)
                break
            }
            
            case PLANE: {
                mesh = new Mesh(_planeGeometry, _material)
                break
            }

            case CYLINDER: {
                mesh = new Mesh(_cylinderGeometry, _material)
                break
            }

            case CONVEXPOLYHEDRON: {
                const geometry = createConvexPolyhedronGeometry(shape)
                mesh = new Mesh(geometry, _material)
                shape.geometryId = geometry.id
                break
            }

            case TRIMESH: {
                const geometry = createTrimeshGeometry(shape)
                mesh = new Mesh(geometry, _material)
                shape.geometryId = geometry.id
                break
            }

            case HEIGHTFIELD: {
                const geometry = createHeightfieldGeometry(shape)
                mesh = new Mesh(geomety, _material)
                shape.geometryId = geometry.id
                break
            }
        }

        scene.add(mesh)
        return mesh
    }

    function scaleMesh(mesh, shape) {
        const { SPHERE, BOX, CYLINDER, CONVEXPOLYHEDRON, TRIMESH, HEIGHTFIELD } = Shape.types;

        switch (shape.type) {
            case SPHERE: {
                const { radius } = shape
                mesh.scale.set(radius, radius, radius)
                break
            }

            case BOX: {
                mesh.scale.copy(shape.halfExtents)
                mesh.multiplyScalar(2)
                break
            }
            
            case PLANE: {
                break
            }

            case CYLINDER: {
                mesh.scale.set(1, 1, 1)
                break
            }

            case CONVEXPOLYHEDRON: {
                mesh.scale.set(1, 1, 1)
                break
            }

            case TRIMESH: {
                mesh.scale.copy(shape.scale)
                break
            }

            case HEIGHTFIELD: {
                mesh.scale.set(1, 1, 1)
                break
            }
        }

    }

    function typeMatch(mesh, shape) {
        if (!mesh) {
            return false
        }
    
        const { geometry } = mesh
    
        return (
            (geometry instanceof SphereGeometry && shape instanceof Sphere)
            || (geometry instanceof BoxGeometry && shape instanceof Box)
            || (geometry instanceof PlaneGeometry && shape instanceof Plane)
            || (geometry.id === shape.geometryId && shape instanceof ConvexPolyhedron)
            || (geometry.id === shape.geometryId && shape instanceof Trimesh)
            || (geometry.id === shape.geometryId && shape instanceof Heightfield)
        )
    } 

    function updateMesh(index, shape) {
        let mesh = _meshes[index]

        if (!typeMatch(mesh, shape)) {
            if (mesh) {
                scene.remove(mesh)
            }

            _meshes[index] = mesh = createMesh(shape)
        }

        scaleMesh(mesh, shape)
    }

    function update() {
        const meshes = _meshes
        const shapeWorldPosition = _tempVec0
        const shapeWorldQuaternion = _tempQuat0

        let meshIndex = 0

        for (const body of bodies) {
            for (let i = 0; i !== body.shapes.length; i++) {
                const shape = body.shapes[i]
                updateMesh(meshIndex, shape)
                const mesh = meshes[meshIndex]

                if (mesh) {
					body.quaternion.vmult(body.shapeOffsets[i], shapeWorldPosition);
					body.position.vadd(shapeWorldPosition, shapeWorldPosition);
					body.quaternion.mult(body.shapeOrientations[i], shapeWorldQuaternion);
					mesh.position.copy(shapeWorldPosition);
					mesh.quaternion.copy(shapeWorldQuaternion);
                }

                meshIndex++
            }
        }

        for (let i = meshIndex; i < meshes.length; i++) {
            const mesh = meshes[i]

            if (mesh) {
                scene.remove(mesh)
            }
        }

        meshes.length = meshIndex

        requestAnimationFrame(update)
    }

    requestAnimationFrame(update)
}